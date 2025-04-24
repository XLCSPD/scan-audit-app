import React, { useState, useEffect, useMemo } from 'react';
// Import necessary functions from the Firebase Firestore SDK
import {
  getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy
} from 'firebase/firestore';
// Import chart components from Recharts
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// --- Firebase Initialization ---
import { db } from './firebaseConfig';

// --- Logo Import ---
// Use the primary logo name from the brand guide
import xlcLogo from './xlc_logo_gold.png'; // Make sure this file exists in src/

// --- Helper Functions ---
function getCurrentDate() { const now = new Date(); const year = now.getFullYear(); const month = String(now.getMonth() + 1).padStart(2, '0'); const day = String(now.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
function getCurrentTime() { const now = new Date(); const hours = String(now.getHours()).padStart(2, '0'); const minutes = String(now.getMinutes()).padStart(2, '0'); return `${hours}:${minutes}`; }
// Helper to format Firestore Timestamps or date strings
function formatDisplayDate(timestampOrDateString) {
    if (!timestampOrDateString) return 'N/A';
    try {
        if (timestampOrDateString.toDate) { // Firestore Timestamp object
            return timestampOrDateString.toDate().toLocaleDateString();
        }
        // Assume YYYY-MM-DD string or similar Date parsable string
        const date = new Date(timestampOrDateString);
        if (!isNaN(date.getTime())) { // Check if date is valid
             // Ensure correct date parsing, especially if just YYYY-MM-DD
             const parts = timestampOrDateString.split(/[-/]/); // Split by hyphen or slash
             if (parts.length === 3) {
                 const year = parseInt(parts[0]);
                 const month = parseInt(parts[1]);
                 const day = parseInt(parts[2]);
                 // Basic validation for year, month, day ranges
                 if (year > 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    // Create date in UTC to avoid timezone issues with just date strings
                    const utcDate = new Date(Date.UTC(year, month - 1, day));
                    if(!isNaN(utcDate.getTime())) return utcDate.toLocaleDateString();
                 }
             }
             // Fallback for other parsable formats if the specific check fails
             return date.toLocaleDateString();
        }
        return timestampOrDateString; // Return original string if not parsable
    } catch (e) {
        console.error("Error formatting date:", e, "Input:", timestampOrDateString);
        return String(timestampOrDateString); // Fallback to string representation
    }
}
function formatDisplayTime(timestampOrTimeString) {
     if (!timestampOrTimeString) return '';
     try {
         if (timestampOrTimeString.toDate) { // Firestore Timestamp object
             return timestampOrTimeString.toDate().toLocaleTimeString();
         }
         // Check if it looks like HH:MM
         if (typeof timestampOrTimeString === 'string' && /^\d{1,2}:\d{2}$/.test(timestampOrTimeString)) { // Allow H:MM or HH:MM
            return timestampOrTimeString;
         }
         // Don't try to parse full date string as time if it wasn't a timestamp
         return ''; // Return empty if not parsable as time or just HH:MM
     } catch (e) {
         console.error("Error formatting time:", e);
         return ''; // Fallback
     }
}


// --- React Components ---

// Input Field Component (Applied base font)
function InputField({ label, id, type = "text", value, onChange, required = false, options = null, placeholder = "" }) {
  return (
    <div className="mb-4">
      {/* Apply body font (default sans) and neutral color */}
      <label htmlFor={id} className="block text-sm font-medium text-xlc-slate mb-1">{label}{required && '*'}</label>
      {type === 'select' ? (
        <select
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          required={required}
          // Use brand radius, add focus state from brand guide (using ring utilities)
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-xlc-gold sm:text-sm"
        >
          <option value="" disabled hidden>{placeholder || `Select ${label}`}</option>
          {options?.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          // Use brand radius, add focus state
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-xlc-gold sm:text-sm"
        />
      )}
    </div>
  );
}

// Initial Check Form Component (Applied branding)
function InitialCheckForm({ currentUser, onSaveSuccess }) {
  const initialFormData = { auditDate: getCurrentDate(), auditTime: getCurrentTime(), shift: '1', auditorName: currentUser || '', warehouse: '', ulidBarcode: '', materialType: '', operatorLastMove: '', expectedDepositLocation: '', scanMatch: 'Yes', };
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const materialTypeOptions = [ { value: 'FG', label: 'FG' }, { value: 'FWIP', label: 'FWIP' }, { value: 'RPM', label: 'RPM' }, { value: 'Other', label: 'Other' }, ];
  const warehouseOptions = [ { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: 'NP', label: 'NP' }, { value: 'SP', label: 'SP' }, { value: 'Other', label: 'Other' }, ];
  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleSubmit = async (e) => { e.preventDefault(); if (!db) { setMessage({ type: 'error', text: 'Firebase not configured.' }); return; } if (!formData.warehouse) { setMessage({ type: 'error', text: 'Please select a Warehouse.' }); return; } if (!formData.materialType) { setMessage({ type: 'error', text: 'Please select a Material Type.' }); return; } setIsLoading(true); setMessage({ type: '', text: '' }); try { const docData = { ...formData, actualLocationPhysical: null, errorType: null, comments: null, isPhysicalMatch: null, createdAt: serverTimestamp() }; const docRef = await addDoc(collection(db, 'scan_audits'), docData); console.log("Document written with ID: ", docRef.id); setMessage({ type: 'success', text: 'Initial check data saved successfully!' }); setFormData(prev => ({ ...initialFormData, auditDate: prev.auditDate, auditTime: prev.auditTime, shift: prev.shift, auditorName: prev.auditorName, })); if (onSaveSuccess) onSaveSuccess(); } catch (error) { console.error("Error adding document: ", error); setMessage({ type: 'error', text: `Failed to save data: ${error.message}.` }); } finally { setIsLoading(false); } };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Use heading font */}
      <h2 className="text-xl font-semibold mb-4 text-black font-heading">Initial Check Data Entry</h2>
      {/* Use alert style from brand guide for success message */}
      {message.type === 'success' && ( <div className="p-3 rounded-md bg-xlc-gold/20 text-black">{message.text}</div> )}
      {/* Standard error styling (can be customized too) */}
      {message.type === 'error' && ( <div className="p-3 rounded-md bg-red-100 text-red-800">{message.text}</div> )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input fields will inherit styling from InputField component */}
        <InputField label="Audit Date" id="auditDate" type="date" value={formData.auditDate} onChange={handleChange} required />
        <InputField label="Audit Time" id="auditTime" type="time" value={formData.auditTime} onChange={handleChange} required />
        <InputField label="Shift" id="shift" type="select" value={formData.shift} onChange={handleChange} required options={[{value: '1', label: 'Shift 1'}, {value: '2', label: 'Shift 2'}, {value: '3', label: 'Shift 3'}]} />
        <InputField label="Auditor Name" id="auditorName" value={formData.auditorName} onChange={handleChange} required />
        <InputField label="Warehouse" id="warehouse" type="select" value={formData.warehouse} onChange={handleChange} options={warehouseOptions} required placeholder="Select Warehouse" />
        <InputField label="ULID/Barcode" id="ulidBarcode" value={formData.ulidBarcode} onChange={handleChange} required />
        <InputField label="Material Type" id="materialType" type="select" value={formData.materialType} onChange={handleChange} options={materialTypeOptions} required placeholder="Select Material Type" />
        <InputField label="Operator (Last Move)" id="operatorLastMove" value={formData.operatorLastMove} onChange={handleChange} />
        <InputField label="Expected Deposit Location" id="expectedDepositLocation" value={formData.expectedDepositLocation} onChange={handleChange} required />
        <InputField label="Scan Match" id="scanMatch" type="select" value={formData.scanMatch} onChange={handleChange} required options={[{value: 'Yes', label: 'Yes'}, {value: 'No', label: 'No'}]} />
      </div>
      {/* Primary Button Style from Brand Guide - Updated hover */}
      <button
        type="submit"
        disabled={isLoading || !db}
        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-semibold rounded-md text-black bg-xlc-gold hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-xlc-gold disabled:opacity-50 disabled:bg-xlc-slate/20 disabled:text-white/60 transition-all duration-150" // Replaced hover:bg-xlc-gold-darker with hover:brightness-110, added transition
      >
        {isLoading ? 'Saving...' : 'Save Initial Check'}
      </button>
    </form>
  );
}

// Confirmation Check Component (Applied branding)
function ConfirmationCheck({ currentUser }) {
  const [allUnconfirmedAudits, setAllUnconfirmedAudits] = useState([]); const [currentAuditIndex, setCurrentAuditIndex] = useState(0); const [isLoadingAudits, setIsLoadingAudits] = useState(false); const [isLoadingAuditorList, setIsLoadingAuditorList] = useState(false); const [error, setError] = useState(null); const [auditorList, setAuditorList] = useState([]); const [currentAuditor, setCurrentAuditor] = useState(''); const [updateStates, setUpdateStates] = useState({}); const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  useEffect(() => { const fetchAuditorNames = async () => { if (!db) { console.error("Firestore not initialized for fetching auditor list."); setError("Firebase not configured. Cannot load auditor list."); return; } setIsLoadingAuditorList(true); setError(null); try { const auditsCollectionRef = collection(db, 'scan_audits'); const q = query(auditsCollectionRef); const querySnapshot = await getDocs(q); const names = new Set(); querySnapshot.forEach((doc) => { const name = doc.data().auditorName; if (name) { names.add(name); } }); const sortedNames = Array.from(names).sort(); setAuditorList(sortedNames); if (currentUser && sortedNames.includes(currentUser)) { setCurrentAuditor(currentUser); } } catch (err) { console.error("Error fetching auditor names:", err); setError("Failed to load auditor list."); } finally { setIsLoadingAuditorList(false); } }; fetchAuditorNames(); }, []);
  const fetchUnconfirmedAudits = async (auditor) => { if (!db) { setError("Firebase not configured."); setAllUnconfirmedAudits([]); setCurrentAuditIndex(0); return; } if (!auditor) { setAllUnconfirmedAudits([]); setCurrentAuditIndex(0); setError(null); return; } setIsLoadingAudits(true); setError(null); setAllUnconfirmedAudits([]); setCurrentAuditIndex(0); setUpdateStates({}); setSaveSuccessMessage(''); try { const auditsCollectionRef = collection(db, 'scan_audits'); const q = query( auditsCollectionRef, where('auditorName', '==', auditor), where('actualLocationPhysical', '==', null), orderBy('createdAt', 'desc') ); const querySnapshot = await getDocs(q); const audits = querySnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })); console.log(`Fetched ${audits.length} unconfirmed audits for ${auditor}`); setAllUnconfirmedAudits(audits); setCurrentAuditIndex(0); if (audits.length === 0) { setError(`No unconfirmed audits found for auditor: ${auditor}`); } } catch (err) { console.error("Error fetching unconfirmed audits:", err); if (err.message && err.message.includes("requires an index")) { setError(`Firestore query requires an index. Please create it in the Firebase console. Error: ${err.message}`); } else { setError(`Failed to load audits: ${err.message}.`); } } finally { setIsLoadingAudits(false); } };
  useEffect(() => { fetchUnconfirmedAudits(currentAuditor); }, [currentAuditor]);
  const currentAudit = allUnconfirmedAudits.length > 0 ? allUnconfirmedAudits[currentAuditIndex] : null;
  const handleAuditorChange = (e) => { setCurrentAuditor(e.target.value); };
  const handleConfirmationChange = (field, value) => { if (!currentAudit) return; const id = currentAudit.id; setUpdateStates(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value, message: null } })); setSaveSuccessMessage(''); };
  const handleSaveConfirmation = async () => { if (!currentAudit) return; const id = currentAudit.id; if (!db) { setUpdateStates(prev => ({ ...prev, [id]: { ...prev[id], message: { type: 'error', text: 'Firebase not configured.' } } })); return; } const currentUpdateData = updateStates[id] || {}; const actualLocation = currentUpdateData.actualLocationPhysical?.trim() || ''; const errorType = currentUpdateData.errorType?.trim() || ''; const comments = currentUpdateData.comments?.trim() || ''; if (!actualLocation) { setUpdateStates(prev => ({ ...prev, [id]: { ...prev[id], message: { type: 'error', text: 'Actual Location is required.' } } })); return; } setUpdateStates(prev => ({ ...prev, [id]: { ...prev[id], isLoading: true, message: null } })); setSaveSuccessMessage(''); const isPhysicalMatch = actualLocation === currentAudit.expectedDepositLocation ? 'Yes' : 'No'; const dataToUpdate = { actualLocationPhysical: actualLocation, errorType: errorType, comments: comments, isPhysicalMatch: isPhysicalMatch, updatedAt: serverTimestamp() }; try { const docRef = doc(db, 'scan_audits', id); await updateDoc(docRef, dataToUpdate); setUpdateStates(prev => { const newState = { ...prev }; delete newState[id]; return newState; }); setSaveSuccessMessage(`Audit ${currentAudit.ulidBarcode || id} saved successfully! Loading next...`); fetchUnconfirmedAudits(currentAuditor); } catch (error) { console.error("Error updating document: ", error); setUpdateStates(prev => ({ ...prev, [id]: { ...prev[id], isLoading: false, message: { type: 'error', text: `Save failed: ${error.message}` } } })); } };
  const handleNextAudit = () => { if (currentAuditIndex < allUnconfirmedAudits.length - 1) { setCurrentAuditIndex(prevIndex => prevIndex + 1); setSaveSuccessMessage(''); } };
  const handlePreviousAudit = () => { if (currentAuditIndex > 0) { setCurrentAuditIndex(prevIndex => prevIndex - 1); setSaveSuccessMessage(''); } };
  const currentItemState = currentAudit ? (updateStates[currentAudit.id] || {}) : {};
  let displayDate = currentAudit?.auditDate || 'N/A'; let displayTime = currentAudit?.auditTime || ''; if (currentAudit?.createdAt?.toDate) { try { const dateObj = currentAudit.createdAt.toDate(); displayDate = dateObj.toLocaleDateString(); displayTime = dateObj.toLocaleTimeString(); } catch (e) { console.error("Error formatting timestamp:", e); } }

  return (
    <div className="space-y-6">
      {/* Use heading font */}
      <h2 className="text-xl font-semibold text-black font-heading">Confirmation Check</h2>
      <div className="mb-4">
           {/* Use body font/color for label */}
           <label htmlFor="auditorSelect" className="block text-sm font-medium text-xlc-slate mb-1">Auditor Name</label>
           <select
               id="auditorSelect"
               value={currentAuditor}
               onChange={handleAuditorChange}
               disabled={isLoadingAuditorList || !db}
               // Use brand radius and focus state
               className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-xlc-gold sm:text-sm disabled:bg-gray-100"
           >
               <option value="" disabled={isLoadingAuditorList}>
                   {isLoadingAuditorList ? 'Loading auditors...' : 'Select Auditor'}
               </option>
               {auditorList.map(name => ( <option key={name} value={name}>{name}</option> ))}
           </select>
      </div>

      {/* Loading/Error Messages - Use brand colors */}
      {isLoadingAudits && <p className="text-xlc-slate">Loading audits...</p>}
      {error && !isLoadingAudits && <p className="text-red-600 p-3 bg-red-100 border border-red-300 rounded-md">{error}</p>}
      {/* Use success alert style */}
      {saveSuccessMessage && <p className="p-3 rounded-md bg-xlc-gold/20 text-black">{saveSuccessMessage}</p>}

      {!isLoadingAudits && allUnconfirmedAudits.length > 0 && currentAudit && (
        <>
          {/* Navigation - Apply Primary Button Style with lighter hover */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePreviousAudit}
              disabled={currentAuditIndex === 0}
              // Apply primary button style with lighter hover
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-md text-black bg-xlc-gold hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-xlc-gold disabled:opacity-50 disabled:bg-xlc-slate/20 disabled:text-white/60 transition-all duration-150"
            >
              &larr; Previous
            </button>
            {/* Use body font/color */}
            <span className="text-sm font-medium text-xlc-slate">
              Audit {currentAuditIndex + 1} of {allUnconfirmedAudits.length}
            </span>
            <button
              onClick={handleNextAudit}
              disabled={currentAuditIndex === allUnconfirmedAudits.length - 1}
              // Apply primary button style with lighter hover
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-md text-black bg-xlc-gold hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-xlc-gold disabled:opacity-50 disabled:bg-xlc-slate/20 disabled:text-white/60 transition-all duration-150"
            >
              Next &rarr;
            </button>
          </div>

          {/* Card Style from Brand Guide */}
          <div key={currentAudit.id} className="p-4 border border-gray-200 rounded-md shadow-[0_4px_8px_rgba(0,0,0,0.08)] bg-white">
             {/* Use heading font */}
             <h3 className="text-lg font-semibold text-black font-heading mb-3">Confirming Audit: {currentAudit.ulidBarcode || currentAudit.id}</h3>
             {/* Use body font/color for details */}
             <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm mb-3 text-xlc-slate">
                 <div><strong>Date:</strong> {displayDate} {displayTime}</div>
                 <div><strong>Warehouse:</strong> {currentAudit.warehouse || 'N/A'}</div>
                 <div><strong>Expected Loc:</strong> {currentAudit.expectedDepositLocation || 'N/A'}</div>
                 <div><strong>Operator:</strong> {currentAudit.operatorLastMove || 'N/A'}</div>
                 <div><strong>Scan Match:</strong> {currentAudit.scanMatch || 'N/A'}</div>
                 <div><strong>Material:</strong> {currentAudit.materialType || 'N/A'}</div>
             </div>

             {/* Confirmation Inputs */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <InputField label="Actual Location (Physical)" id={`actualLocation-${currentAudit.id}`} value={currentItemState?.actualLocationPhysical ?? ''} onChange={(e) => handleConfirmationChange('actualLocationPhysical', e.target.value)} required />
                <InputField label="Error Type (Optional)" id={`errorType-${currentAudit.id}`} value={currentItemState?.errorType ?? ''} onChange={(e) => handleConfirmationChange('errorType', e.target.value)} />
             </div>
              <div className="mt-4">
                 <label htmlFor={`comments-${currentAudit.id}`} className="block text-sm font-medium text-xlc-slate mb-1">Comments (Optional)</label>
                 <textarea id={`comments-${currentAudit.id}`} rows="2" value={currentItemState?.comments ?? ''} onChange={(e) => handleConfirmationChange('comments', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-xlc-gold sm:text-sm"></textarea>
              </div>

             {/* Display specific error/loading for this item */}
             {currentItemState?.message?.type === 'error' && ( <div className="mt-2 text-sm p-2 rounded bg-red-100 text-red-700">{currentItemState.message.text}</div> )}
             {/* Success message is now handled globally */}

             {/* Primary Button Style with lighter hover */}
             <button
               onClick={handleSaveConfirmation}
               disabled={currentItemState?.isLoading || !db}
               className="mt-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-semibold rounded-md text-black bg-xlc-gold hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-xlc-gold disabled:opacity-50 disabled:bg-xlc-slate/20 disabled:text-white/60 transition-all duration-150"
             >
               {currentItemState?.isLoading ? 'Saving...' : 'Save Confirmation'}
             </button>
           </div>
        </>
      )}

      {!isLoadingAudits && allUnconfirmedAudits.length === 0 && currentAuditor && !error && (
          <p className="text-xlc-slate mt-4">No unconfirmed audits found for {currentAuditor}.</p>
      )}

    </div>
  );
}

// Dashboard Component (Applied branding)
function Dashboard() {
  const [auditData, setAuditData] = useState([]); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState(null);
  // Use brand colors
  const COLORS = { Good: '#FCC222', Bad: '#515459', }; // Gold for Good, Slate for Bad (adjust if needed)

  useEffect(() => { const fetchAuditData = async () => { if (!db) { setError("Firebase not configured."); setIsLoading(false); return; } setIsLoading(true); setError(null); try { const auditsCollectionRef = collection(db, 'scan_audits'); const q = query(auditsCollectionRef, where('isPhysicalMatch', '!=', null)); const querySnapshot = await getDocs(q); const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); setAuditData(data); console.log(`Fetched ${data.length} confirmed audits for dashboard`); } catch (err) { console.error("Error fetching audit data for dashboard:", err); setError(`Failed to load dashboard data: ${err.message}`); } finally { setIsLoading(false); } }; fetchAuditData(); }, []);
  const processGroupedData = (data, groupByField) => { const grouped = data.reduce((acc, audit) => { const groupKey = audit[groupByField] || 'Unknown'; if (!acc[groupKey]) { acc[groupKey] = { name: groupKey, scanGood: 0, scanBad: 0, physicalGood: 0, physicalBad: 0, total: 0 }; } acc[groupKey].total++; if (audit.scanMatch === 'Yes') acc[groupKey].scanGood++; else acc[groupKey].scanBad++; if (audit.isPhysicalMatch === 'Yes') acc[groupKey].physicalGood++; else acc[groupKey].physicalBad++; return acc; }, {}); return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name)); };
  const processDataByDate = (data) => { const grouped = data.reduce((acc, audit) => { const dateKey = audit.auditDate || 'Unknown Date'; if (!acc[dateKey]) { acc[dateKey] = { name: dateKey, scanGood: 0, scanBad: 0, physicalGood: 0, physicalBad: 0, total: 0 }; } acc[dateKey].total++; if (audit.scanMatch === 'Yes') acc[dateKey].scanGood++; else acc[dateKey].scanBad++; if (audit.isPhysicalMatch === 'Yes') acc[dateKey].physicalGood++; else acc[dateKey].physicalBad++; return acc; }, {}); return Object.values(grouped).sort((a, b) => new Date(a.name) - new Date(b.name)); };
  const dataByDate = processDataByDate(auditData); const dataByShift = processGroupedData(auditData, 'shift'); const dataByOperator = processGroupedData(auditData, 'operatorLastMove'); const dataByWarehouse = processGroupedData(auditData, 'warehouse'); const dataByMaterial = processGroupedData(auditData, 'materialType');
  if (isLoading) { return <div className="text-xlc-slate">Loading dashboard data...</div>; } if (error) { return <div className="text-red-600 p-3 bg-red-100 border border-red-300 rounded-md">{error}</div>; } if (auditData.length === 0) { return <div className="text-xlc-slate">No confirmed audit data available to display.</div>; }

  // Chart Components - Apply brand font (Recharts should inherit)
  const renderBarChart = (data, title, dataKeyScan, dataKeyPhysical) => (
    // Use card style
    <div className="mb-8 p-4 border border-gray-200 rounded-md shadow-[0_4px_8px_rgba(0,0,0,0.08)] bg-white">
      {/* Use heading font */}
      <h3 className="text-lg font-semibold mb-4 text-center text-black font-heading">{title}</h3>
      {data.length > 0 ? ( <ResponsiveContainer width="100%" height={300}> <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" angle={data.length > 10 ? -45 : 0} textAnchor={data.length > 10 ? "end" : "middle"} height={data.length > 10 ? 70 : 30} interval={0} fontSize={12} stroke="#515459"/> <YAxis allowDecimals={false} stroke="#515459"/> <Tooltip /> <Legend /> <Bar dataKey={dataKeyScan + "Good"} stackId="scan" name="Scan Good" fill={COLORS.Good} /> <Bar dataKey={dataKeyScan + "Bad"} stackId="scan" name="Scan Bad" fill={COLORS.Bad} /> <Bar dataKey={dataKeyPhysical + "Good"} stackId="physical" name="Physical Good" fill={COLORS.Good} /> <Bar dataKey={dataKeyPhysical + "Bad"} stackId="physical" name="Physical Bad" fill={COLORS.Bad} /> </BarChart> </ResponsiveContainer> ) : <p className="text-center text-xlc-slate">No data for this chart.</p>}
    </div>
  );
  const renderLineChart = (data, title) => (
    // Use card style
    <div className="mb-8 p-4 border border-gray-200 rounded-md shadow-[0_4px_8px_rgba(0,0,0,0.08)] bg-white">
       {/* Use heading font */}
      <h3 className="text-lg font-semibold mb-4 text-center text-black font-heading">{title}</h3>
      {data.length > 0 ? ( <ResponsiveContainer width="100%" height={300}> <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" angle={data.length > 10 ? -45 : 0} textAnchor={data.length > 10 ? "end" : "middle"} height={data.length > 10 ? 70 : 30} interval={Math.max(0, Math.floor(data.length / 15))} fontSize={12} stroke="#515459"/> <YAxis allowDecimals={false} stroke="#515459"/> <Tooltip /> <Legend /> <Line type="monotone" dataKey="scanGood" name="Scan Good" stroke={COLORS.Good} strokeWidth={2} dot={false}/> <Line type="monotone" dataKey="scanBad" name="Scan Bad" stroke={COLORS.Bad} strokeWidth={2} dot={false}/> <Line type="monotone" dataKey="physicalGood" name="Physical Good" stroke={COLORS.Good} strokeDasharray="5 5" dot={false}/> <Line type="monotone" dataKey="physicalBad" name="Physical Bad" stroke={COLORS.Bad} strokeDasharray="5 5" dot={false}/> </LineChart> </ResponsiveContainer> ) : <p className="text-center text-xlc-slate">No data for this chart.</p>}
    </div>
  );

  return (
    <div>
      {/* Use heading font */}
      <h2 className="text-xl font-semibold text-black font-heading mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderLineChart(dataByDate, "Matches by Date")}
        {renderBarChart(dataByShift, "Matches by Shift", "scan", "physical")}
        {renderBarChart(dataByOperator, "Matches by Operator", "scan", "physical")}
        {renderBarChart(dataByWarehouse, "Matches by Warehouse", "scan", "physical")}
        {renderBarChart(dataByMaterial, "Matches by Material Type", "scan", "physical")}
      </div>
    </div>
  );
}

// Records Page Component (Applied branding)
function RecordsPage() {
    const [allAuditData, setAllAuditData] = useState([]); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState(null); const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' }); const [filterValues, setFilterValues] = useState({ auditDate: '', auditorName: '', warehouse: '', ulidBarcode: '', materialType: '', operatorLastMove: '', scanMatch: '', isPhysicalMatch: '' });
    useEffect(() => { const fetchAllAuditData = async () => { if (!db) { setError("Firebase not configured."); setIsLoading(false); return; } setIsLoading(true); setError(null); try { const auditsCollectionRef = collection(db, 'scan_audits'); const q = query(auditsCollectionRef); const querySnapshot = await getDocs(q); const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); setAllAuditData(data); console.log(`Fetched ${data.length} total audits for records page`); } catch (err) { console.error("Error fetching all audit data:", err); setError(`Failed to load records: ${err.message}`); } finally { setIsLoading(false); } }; fetchAllAuditData(); }, []);
    const filteredAndSortedData = useMemo(() => { let filterableItems = [...allAuditData]; Object.entries(filterValues).forEach(([key, value]) => { if (value) { const filterValueLower = value.toLowerCase(); filterableItems = filterableItems.filter(item => { const itemValue = item[key]; const itemValueStr = itemValue ? String(itemValue).toLowerCase() : ''; return itemValueStr.includes(filterValueLower); }); } }); if (sortConfig.key !== null) { filterableItems.sort((a, b) => { let aValue = a[sortConfig.key]; let bValue = b[sortConfig.key]; if (aValue?.toDate) aValue = aValue.toDate(); if (bValue?.toDate) bValue = bValue.toDate(); if (aValue < bValue) { return sortConfig.direction === 'ascending' ? -1 : 1; } if (aValue > bValue) { return sortConfig.direction === 'ascending' ? 1 : -1; } return 0; }); } return filterableItems; }, [allAuditData, filterValues, sortConfig]);
    const requestSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } else if (sortConfig.key === key && sortConfig.direction === 'descending') { direction = 'ascending'; } setSortConfig({ key, direction }); };
    const handleFilterChange = (e) => { const { name, value } = e.target; setFilterValues(prevFilters => ({ ...prevFilters, [name]: value })); };
    const getSortIndicator = (columnKey) => { if (sortConfig.key !== columnKey) { return <span className="text-gray-400 ml-1">↕</span>; } return sortConfig.direction === 'ascending' ? <span className="text-black ml-1">↑</span> : <span className="text-black ml-1">↓</span>; };
    const columns = [ { key: 'auditDate', label: 'Date', filterable: true, sortable: true }, { key: 'auditTime', label: 'Time', filterable: false, sortable: true }, { key: 'auditorName', label: 'Auditor', filterable: true, sortable: true }, { key: 'warehouse', label: 'WH', filterable: true, sortable: true }, { key: 'ulidBarcode', label: 'ULID/Barcode', filterable: true, sortable: true }, { key: 'materialType', label: 'Material', filterable: true, sortable: true }, { key: 'operatorLastMove', label: 'Operator', filterable: true, sortable: true }, { key: 'expectedDepositLocation', label: 'Expected Loc', filterable: false, sortable: true }, { key: 'actualLocationPhysical', label: 'Actual Loc', filterable: false, sortable: true }, { key: 'scanMatch', label: 'Scan Match', filterable: true, sortable: true }, { key: 'isPhysicalMatch', label: 'Physical Match', filterable: true, sortable: true }, { key: 'errorType', label: 'Error Type', filterable: false, sortable: true }, { key: 'comments', label: 'Comments', filterable: false, sortable: false }, { key: 'createdAt', label: 'Created At', filterable: false, sortable: true }, ];
    if (isLoading) return <div className="text-xlc-slate">Loading records...</div>; if (error) return <div className="text-red-600 p-3 bg-red-100 border border-red-300 rounded-md">{error}</div>;

    return (
        <div>
            {/* Use heading font */}
            <h2 className="text-xl font-semibold text-black font-heading mb-4">All Audit Records</h2>

            {/* Filter Section - Use card style? */}
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md bg-white shadow-[0_4px_8px_rgba(0,0,0,0.08)]">
                {columns.filter(col => col.filterable).map(col => (
                    <div key={col.key}>
                        {/* Use body font/color */}
                        <label htmlFor={`filter-${col.key}`} className="block text-sm font-medium text-xlc-slate mb-1">
                            Filter {col.label}
                        </label>
                        <input
                            type={col.key === 'auditDate' ? 'date' : 'text'}
                            id={`filter-${col.key}`}
                            name={col.key}
                            value={filterValues[col.key]}
                            onChange={handleFilterChange}
                            placeholder={`Filter by ${col.label}...`}
                            // Use brand radius and focus
                            className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-xlc-gold sm:text-sm"
                        />
                    </div>
                ))}
            </div>

            {/* Table Section */}
            <div className="overflow-x-auto shadow-[0_4px_8px_rgba(0,0,0,0.08)] rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    {/* Use slate background for header */}
                    <thead className="bg-xlc-slate">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    onClick={() => col.sortable && requestSort(col.key)}
                                    // Use gold text on slate bg? Ensure contrast. Use heading font?
                                    className={`px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:bg-gray-700' : ''}`}
                                >
                                    {col.label}
                                    {col.sortable && getSortIndicator(col.key)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    {/* Use body font/color for table data */}
                    <tbody className="bg-white divide-y divide-gray-200 text-xlc-slate">
                        {filteredAndSortedData.length > 0 ? (
                            filteredAndSortedData.map((audit) => (
                                <tr key={audit.id} className="hover:bg-xlc-gold/10"> {/* Subtle gold hover */}
                                    {columns.map(col => (
                                        <td key={col.key} className="px-4 py-3 whitespace-nowrap text-sm">
                                            {col.key === 'createdAt' || col.key === 'updatedAt' ? formatDisplayDate(audit[col.key]) + ' ' + formatDisplayTime(audit[col.key]) : col.key === 'auditDate' ? formatDisplayDate(audit[col.key]) : String(audit[col.key] ?? '') }
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-4 text-xlc-slate">
                                    No records found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
             <p className="text-sm text-xlc-slate mt-2">Displaying {filteredAndSortedData.length} of {allAuditData.length} records.</p>
        </div>
    );
}


// Main App Component (Applied branding)
function App() {
  const [activeTab, setActiveTab] = useState('initial');
  useEffect(() => { if (!db) { console.warn("Firebase 'db' instance is not initialized."); } }, []);

  const renderActiveTab = () => { switch (activeTab) { case 'initial': return <InitialCheckForm currentUser="DefaultUser" />; case 'confirmation': return <ConfirmationCheck currentUser="DefaultUser" />; case 'dashboard': return <Dashboard />; case 'records': return <RecordsPage />; default: return <InitialCheckForm currentUser="DefaultUser" />; } };

  // Updated TabButton component with brand styles
  const TabButton = ({ tabId, label }) => (
     <button
        onClick={() => setActiveTab(tabId)}
        // Apply brand button styles based on active state
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-xlc-gold ${
          activeTab === tabId
            ? 'bg-xlc-gold text-black shadow-md' // Primary button style for active tab
            : 'text-xlc-gold border-2 border-xlc-gold bg-transparent hover:bg-xlc-gold/10' // Secondary button style for inactive
        }`}
      >
        {label}
      </button>
  );


  return (
    // Use white background as per brand guide
    <div className="min-h-screen bg-white p-4 md:p-8 font-sans"> {/* Changed bg to white */}
      {/* Use white background and standard shadow for main card */}
      <div className="max-w-6xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-[0_4px_8px_rgba(0,0,0,0.08)] border border-gray-200">
        <div className="flex justify-center mb-4">
           {/* Ensure logo file is named xlc_logo_gold.png in src/ */}
           {/* Increased logo size further */}
           <img src={xlcLogo} alt="XLC Services Logo" className="h-20 w-auto" /> {/* Changed h-16 to h-20 */}
        </div>
        {/* Use heading font and black color */}
        <h1 className="text-2xl md:text-3xl font-bold text-center text-black font-heading mb-6">Scan Audit Application</h1>
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200 pb-3 flex justify-center space-x-2 md:space-x-4">
           <TabButton tabId="initial" label="Initial Check" />
           <TabButton tabId="confirmation" label="Confirmation Check" />
           <TabButton tabId="dashboard" label="Dashboard" />
           <TabButton tabId="records" label="Records" />
        </div>
        <div>
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}

export default App;
