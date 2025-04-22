import React, { useState, useEffect, useMemo } from 'react';
// Import necessary functions from the Firebase Firestore SDK
import {
  getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy
} from 'firebase/firestore';
// Import chart components from Recharts
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'; // Removed PieChart imports as they weren't used

// --- Firebase Initialization ---
import { db } from './firebaseConfig';

// --- Logo Import ---
import xlcLogo from './xlc_logo.png';

// --- Helper Functions ---
function getCurrentDate() { /* ... (no changes) ... */
    const now = new Date(); const year = now.getFullYear(); const month = String(now.getMonth() + 1).padStart(2, '0'); const day = String(now.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`;
}
function getCurrentTime() { /* ... (no changes) ... */
    const now = new Date(); const hours = String(now.getHours()).padStart(2, '0'); const minutes = String(now.getMinutes()).padStart(2, '0'); return `${hours}:${minutes}`;
}
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
             return date.toLocaleDateString();
        }
        return timestampOrDateString; // Return original string if not parsable
    } catch (e) {
        console.error("Error formatting date:", e);
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
         if (typeof timestampOrTimeString === 'string' && /^\d{2}:\d{2}$/.test(timestampOrTimeString)) {
            return timestampOrTimeString;
         }
         // Try parsing as a full date string to get time
         const date = new Date(timestampOrTimeString);
         if (!isNaN(date.getTime())) {
              return date.toLocaleTimeString();
         }
         return ''; // Return empty if not parsable as time
     } catch (e) {
         console.error("Error formatting time:", e);
         return ''; // Fallback
     }
}


// --- React Components ---

// Input Field Component (No changes needed)
function InputField({ label, id, type = "text", value, onChange, required = false, options = null, placeholder = "" }) { /* ... (no changes) ... */
  return ( <div className="mb-4"> <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && '*'}</label> {type === 'select' ? ( <select id={id} name={id} value={value} onChange={onChange} required={required} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"> <option value="" disabled hidden>{placeholder || `Select ${label}`}</option> {options?.map(option => ( <option key={option.value} value={option.value}>{option.label}</option> ))} </select> ) : ( <input type={type} id={id} name={id} value={value} onChange={onChange} required={required} placeholder={placeholder} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /> )} </div> );
}

// Initial Check Form Component (No changes needed)
function InitialCheckForm({ currentUser, onSaveSuccess }) { /* ... (no changes) ... */
  const initialFormData = { auditDate: getCurrentDate(), auditTime: getCurrentTime(), shift: '1', auditorName: currentUser || '', warehouse: '', ulidBarcode: '', materialType: '', operatorLastMove: '', expectedDepositLocation: '', scanMatch: 'Yes', }; const [formData, setFormData] = useState(initialFormData); const [isLoading, setIsLoading] = useState(false); const [message, setMessage] = useState({ type: '', text: '' }); const materialTypeOptions = [ { value: 'FG', label: 'FG' }, { value: 'FWIP', label: 'FWIP' }, { value: 'RPM', label: 'RPM' }, { value: 'Other', label: 'Other' }, ]; const warehouseOptions = [ { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: 'NP', label: 'NP' }, { value: 'SP', label: 'SP' }, { value: 'Other', label: 'Other' }, ]; const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); }; const handleSubmit = async (e) => { e.preventDefault(); if (!db) { setMessage({ type: 'error', text: 'Firebase not configured.' }); return; } if (!formData.warehouse) { setMessage({ type: 'error', text: 'Please select a Warehouse.' }); return; } if (!formData.materialType) { setMessage({ type: 'error', text: 'Please select a Material Type.' }); return; } setIsLoading(true); setMessage({ type: '', text: '' }); try { const docData = { ...formData, actualLocationPhysical: null, errorType: null, comments: null, isPhysicalMatch: null, createdAt: serverTimestamp() }; const docRef = await addDoc(collection(db, 'scan_audits'), docData); console.log("Document written with ID: ", docRef.id); setMessage({ type: 'success', text: 'Initial check data saved successfully!' }); setFormData(prev => ({ ...initialFormData, auditDate: prev.auditDate, auditTime: prev.auditTime, shift: prev.shift, auditorName: prev.auditorName, })); if (onSaveSuccess) onSaveSuccess(); } catch (error) { console.error("Error adding document: ", error); setMessage({ type: 'error', text: `Failed to save data: ${error.message}.` }); } finally { setIsLoading(false); } };
  return ( <form onSubmit={handleSubmit} className="space-y-4"> <h2 className="text-xl font-semibold mb-4 text-gray-800">Initial Check Data Entry</h2> {message.text && ( <div className={`p-3 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</div> )} <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <InputField label="Audit Date" id="auditDate" type="date" value={formData.auditDate} onChange={handleChange} required /> <InputField label="Audit Time" id="auditTime" type="time" value={formData.auditTime} onChange={handleChange} required /> <InputField label="Shift" id="shift" type="select" value={formData.shift} onChange={handleChange} required options={[{value: '1', label: 'Shift 1'}, {value: '2', label: 'Shift 2'}, {value: '3', label: 'Shift 3'}]} /> <InputField label="Auditor Name" id="auditorName" value={formData.auditorName} onChange={handleChange} required /> <InputField label="Warehouse" id="warehouse" type="select" value={formData.warehouse} onChange={handleChange} options={warehouseOptions} required placeholder="Select Warehouse" /> <InputField label="ULID/Barcode" id="ulidBarcode" value={formData.ulidBarcode} onChange={handleChange} required /> <InputField label="Material Type" id="materialType" type="select" value={formData.materialType} onChange={handleChange} options={materialTypeOptions} required placeholder="Select Material Type" /> <InputField label="Operator (Last Move)" id="operatorLastMove" value={formData.operatorLastMove} onChange={handleChange} /> <InputField label="Expected Deposit Location" id="expectedDepositLocation" value={formData.expectedDepositLocation} onChange={handleChange} required /> <InputField label="Scan Match" id="scanMatch" type="select" value={formData.scanMatch} onChange={handleChange} required options={[{value: 'Yes', label: 'Yes'}, {value: 'No', label: 'No'}]} /> </div> <button type="submit" disabled={isLoading || !db} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">{isLoading ? 'Saving...' : 'Save Initial Check'}</button> </form> );
}

// Confirmation Check Component (No changes needed)
function ConfirmationCheck({ currentUser }) { /* ... (no changes from previous version) ... */
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
  return ( <div className="space-y-6"> <h2 className="text-xl font-semibold text-gray-800">Confirmation Check</h2> <div className="mb-4"> <label htmlFor="auditorSelect" className="block text-sm font-medium text-gray-700 mb-1">Auditor Name</label> <select id="auditorSelect" value={currentAuditor} onChange={handleAuditorChange} disabled={isLoadingAuditorList || !db} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"> <option value="" disabled={isLoadingAuditorList}>{isLoadingAuditorList ? 'Loading auditors...' : 'Select Auditor'}</option> {auditorList.map(name => ( <option key={name} value={name}>{name}</option> ))} </select> </div> {isLoadingAudits && <p className="text-gray-600">Loading audits...</p>} {error && !isLoadingAudits && <p className="text-red-600 p-3 bg-red-100 border border-red-300 rounded-md">{error}</p>} {saveSuccessMessage && <p className="text-green-600 p-3 bg-green-100 border border-green-300 rounded-md">{saveSuccessMessage}</p>} {!isLoadingAudits && allUnconfirmedAudits.length > 0 && currentAudit && ( <> <div className="flex justify-between items-center mb-4"> <button onClick={handlePreviousAudit} disabled={currentAuditIndex === 0} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">&larr; Previous</button> <span className="text-sm font-medium text-gray-700">Audit {currentAuditIndex + 1} of {allUnconfirmedAudits.length}</span> <button onClick={handleNextAudit} disabled={currentAuditIndex === allUnconfirmedAudits.length - 1} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Next &rarr;</button> </div> <div key={currentAudit.id} className="p-4 border border-gray-200 rounded-md shadow-sm bg-white"> <h3 className="text-lg font-medium text-gray-700 mb-3">Confirming Audit: {currentAudit.ulidBarcode || currentAudit.id}</h3> <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm mb-3"> <div><strong>Date:</strong> {displayDate} {displayTime}</div> <div><strong>Warehouse:</strong> {currentAudit.warehouse || 'N/A'}</div> <div><strong>Expected Loc:</strong> {currentAudit.expectedDepositLocation || 'N/A'}</div> <div><strong>Operator:</strong> {currentAudit.operatorLastMove || 'N/A'}</div> <div><strong>Scan Match:</strong> {currentAudit.scanMatch || 'N/A'}</div> <div><strong>Material:</strong> {currentAudit.materialType || 'N/A'}</div> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"> <InputField label="Actual Location (Physical)" id={`actualLocation-${currentAudit.id}`} value={currentItemState?.actualLocationPhysical ?? ''} onChange={(e) => handleConfirmationChange('actualLocationPhysical', e.target.value)} required /> <InputField label="Error Type (Optional)" id={`errorType-${currentAudit.id}`} value={currentItemState?.errorType ?? ''} onChange={(e) => handleConfirmationChange('errorType', e.target.value)} /> </div> <div className="mt-4"> <label htmlFor={`comments-${currentAudit.id}`} className="block text-sm font-medium text-gray-700 mb-1">Comments (Optional)</label> <textarea id={`comments-${currentAudit.id}`} rows="2" value={currentItemState?.comments ?? ''} onChange={(e) => handleConfirmationChange('comments', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea> </div> {currentItemState?.message && ( <div className={`mt-2 text-sm p-2 rounded ${currentItemState.message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{currentItemState.message.text}</div> )} <button onClick={handleSaveConfirmation} disabled={currentItemState?.isLoading || !db} className="mt-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">{currentItemState?.isLoading ? 'Saving...' : 'Save Confirmation'}</button> </div> </> )} {!isLoadingAudits && allUnconfirmedAudits.length === 0 && currentAuditor && !error && ( <p className="text-gray-600 mt-4">No unconfirmed audits found for {currentAuditor}.</p> )} </div> );
}

// Dashboard Component (No changes needed)
function Dashboard() { /* ... (no changes from previous version) ... */
  const [auditData, setAuditData] = useState([]); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState(null); const COLORS = { Good: '#10B981', Bad: '#EF4444', };
  useEffect(() => { const fetchAuditData = async () => { if (!db) { setError("Firebase not configured."); setIsLoading(false); return; } setIsLoading(true); setError(null); try { const auditsCollectionRef = collection(db, 'scan_audits'); const q = query(auditsCollectionRef, where('isPhysicalMatch', '!=', null)); const querySnapshot = await getDocs(q); const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); setAuditData(data); console.log(`Fetched ${data.length} confirmed audits for dashboard`); } catch (err) { console.error("Error fetching audit data for dashboard:", err); setError(`Failed to load dashboard data: ${err.message}`); } finally { setIsLoading(false); } }; fetchAuditData(); }, []);
  const processGroupedData = (data, groupByField) => { const grouped = data.reduce((acc, audit) => { const groupKey = audit[groupByField] || 'Unknown'; if (!acc[groupKey]) { acc[groupKey] = { name: groupKey, scanGood: 0, scanBad: 0, physicalGood: 0, physicalBad: 0, total: 0 }; } acc[groupKey].total++; if (audit.scanMatch === 'Yes') acc[groupKey].scanGood++; else acc[groupKey].scanBad++; if (audit.isPhysicalMatch === 'Yes') acc[groupKey].physicalGood++; else acc[groupKey].physicalBad++; return acc; }, {}); return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name)); };
  const processDataByDate = (data) => { const grouped = data.reduce((acc, audit) => { const dateKey = audit.auditDate || 'Unknown Date'; if (!acc[dateKey]) { acc[dateKey] = { name: dateKey, scanGood: 0, scanBad: 0, physicalGood: 0, physicalBad: 0, total: 0 }; } acc[dateKey].total++; if (audit.scanMatch === 'Yes') acc[dateKey].scanGood++; else acc[dateKey].scanBad++; if (audit.isPhysicalMatch === 'Yes') acc[dateKey].physicalGood++; else acc[dateKey].physicalBad++; return acc; }, {}); return Object.values(grouped).sort((a, b) => new Date(a.name) - new Date(b.name)); };
  const dataByDate = processDataByDate(auditData); const dataByShift = processGroupedData(auditData, 'shift'); const dataByOperator = processGroupedData(auditData, 'operatorLastMove'); const dataByWarehouse = processGroupedData(auditData, 'warehouse'); const dataByMaterial = processGroupedData(auditData, 'materialType');
  if (isLoading) { return <div>Loading dashboard data...</div>; } if (error) { return <div className="text-red-600 p-3 bg-red-100 border border-red-300 rounded-md">{error}</div>; } if (auditData.length === 0) { return <div>No confirmed audit data available to display.</div>; }
  const renderBarChart = (data, title, dataKeyScan, dataKeyPhysical) => ( <div className="mb-8 p-4 border rounded-lg shadow bg-white"> <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3> {data.length > 0 ? ( <ResponsiveContainer width="100%" height={300}> <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" angle={data.length > 10 ? -45 : 0} textAnchor={data.length > 10 ? "end" : "middle"} height={data.length > 10 ? 70 : 30} interval={0} fontSize={12}/> <YAxis allowDecimals={false} /> <Tooltip /> <Legend /> <Bar dataKey={dataKeyScan + "Good"} stackId="scan" name="Scan Good" fill={COLORS.Good} /> <Bar dataKey={dataKeyScan + "Bad"} stackId="scan" name="Scan Bad" fill={COLORS.Bad} /> <Bar dataKey={dataKeyPhysical + "Good"} stackId="physical" name="Physical Good" fill={COLORS.Good} /> <Bar dataKey={dataKeyPhysical + "Bad"} stackId="physical" name="Physical Bad" fill={COLORS.Bad} /> </BarChart> </ResponsiveContainer> ) : <p className="text-center text-gray-500">No data for this chart.</p>} </div> );
  const renderLineChart = (data, title) => ( <div className="mb-8 p-4 border rounded-lg shadow bg-white"> <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3> {data.length > 0 ? ( <ResponsiveContainer width="100%" height={300}> <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" angle={data.length > 10 ? -45 : 0} textAnchor={data.length > 10 ? "end" : "middle"} height={data.length > 10 ? 70 : 30} interval={Math.max(0, Math.floor(data.length / 15))} fontSize={12} /> <YAxis allowDecimals={false} /> <Tooltip /> <Legend /> <Line type="monotone" dataKey="scanGood" name="Scan Good" stroke={COLORS.Good} strokeWidth={2} dot={false}/> <Line type="monotone" dataKey="scanBad" name="Scan Bad" stroke={COLORS.Bad} strokeWidth={2} dot={false}/> <Line type="monotone" dataKey="physicalGood" name="Physical Good" stroke={COLORS.Good} strokeDasharray="5 5" dot={false}/> <Line type="monotone" dataKey="physicalBad" name="Physical Bad" stroke={COLORS.Bad} strokeDasharray="5 5" dot={false}/> </LineChart> </ResponsiveContainer> ) : <p className="text-center text-gray-500">No data for this chart.</p>} </div> );
  return ( <div> <h2 className="text-xl font-semibold text-gray-800 mb-6">Dashboard</h2> <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> {renderLineChart(dataByDate, "Matches by Date")} {renderBarChart(dataByShift, "Matches by Shift", "scan", "physical")} {renderBarChart(dataByOperator, "Matches by Operator", "scan", "physical")} {renderBarChart(dataByWarehouse, "Matches by Warehouse", "scan", "physical")} {renderBarChart(dataByMaterial, "Matches by Material Type", "scan", "physical")} </div> </div> );
}

// --- Records Page Component ---
function RecordsPage() {
    const [allAuditData, setAllAuditData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });
    // Define which columns can be filtered and their current filter values
    const [filterValues, setFilterValues] = useState({
        auditDate: '',
        auditorName: '',
        warehouse: '',
        ulidBarcode: '',
        materialType: '',
        operatorLastMove: '',
        scanMatch: '', // 'Yes'/'No'/''
        isPhysicalMatch: '' // 'Yes'/'No'/''
    });

    // Fetch all audit data
    useEffect(() => {
        const fetchAllAuditData = async () => {
            if (!db) { setError("Firebase not configured."); setIsLoading(false); return; }
            setIsLoading(true); setError(null);
            try {
                const auditsCollectionRef = collection(db, 'scan_audits');
                // Fetch all documents, consider adding limits for very large datasets
                const q = query(auditsCollectionRef); // No initial filters here, fetch all
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllAuditData(data);
                console.log(`Fetched ${data.length} total audits for records page`);
            } catch (err) {
                console.error("Error fetching all audit data:", err);
                setError(`Failed to load records: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllAuditData();
    }, []);

    // Memoized filtered and sorted data
    const filteredAndSortedData = useMemo(() => {
        let filterableItems = [...allAuditData];

        // Apply filters
        Object.entries(filterValues).forEach(([key, value]) => {
            if (value) {
                const filterValueLower = value.toLowerCase();
                filterableItems = filterableItems.filter(item => {
                    const itemValue = item[key];
                    // Handle potential null/undefined values and convert to string for comparison
                    const itemValueStr = itemValue ? String(itemValue).toLowerCase() : '';
                    return itemValueStr.includes(filterValueLower);
                });
            }
        });

        // Apply sorting
        if (sortConfig.key !== null) {
            filterableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle different data types for sorting
                // Convert Firestore Timestamps to dates for comparison
                if (aValue?.toDate) aValue = aValue.toDate();
                if (bValue?.toDate) bValue = bValue.toDate();

                // Basic comparison (extend as needed for numbers, etc.)
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0; // values are equal
            });
        }

        return filterableItems;
    }, [allAuditData, filterValues, sortConfig]);

    // Handler for changing sort column/direction
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
             // Optional: Third click resets sort or removes it for this column
             // For now, just toggle between ascending/descending
             direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    // Handler for updating filter input values
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterValues(prevFilters => ({
            ...prevFilters,
            [name]: value
        }));
    };

    // Helper to render sort indicator arrows
    const getSortIndicator = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <span className="text-gray-400 ml-1">↕</span>; // Default unsorted indicator
        }
        return sortConfig.direction === 'ascending' ?
            <span className="text-black ml-1">↑</span> :
            <span className="text-black ml-1">↓</span>;
    };

    // Define columns to display and filter
    // Add 'filterable: true' to columns you want a filter input for
    const columns = [
        { key: 'auditDate', label: 'Date', filterable: true, sortable: true },
        { key: 'auditTime', label: 'Time', filterable: false, sortable: true }, // Time sorting might be tricky if just HH:MM string
        { key: 'auditorName', label: 'Auditor', filterable: true, sortable: true },
        { key: 'warehouse', label: 'WH', filterable: true, sortable: true },
        { key: 'ulidBarcode', label: 'ULID/Barcode', filterable: true, sortable: true },
        { key: 'materialType', label: 'Material', filterable: true, sortable: true },
        { key: 'operatorLastMove', label: 'Operator', filterable: true, sortable: true },
        { key: 'expectedDepositLocation', label: 'Expected Loc', filterable: false, sortable: true },
        { key: 'actualLocationPhysical', label: 'Actual Loc', filterable: false, sortable: true },
        { key: 'scanMatch', label: 'Scan Match', filterable: true, sortable: true }, // Filter 'Yes'/'No'
        { key: 'isPhysicalMatch', label: 'Physical Match', filterable: true, sortable: true }, // Filter 'Yes'/'No'
        { key: 'errorType', label: 'Error Type', filterable: false, sortable: true },
        { key: 'comments', label: 'Comments', filterable: false, sortable: false },
        { key: 'createdAt', label: 'Created At', filterable: false, sortable: true }, // Hidden by default maybe?
    ];


    if (isLoading) return <div>Loading records...</div>;
    if (error) return <div className="text-red-600 p-3 bg-red-100 border border-red-300 rounded-md">{error}</div>;

    return (
        <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">All Audit Records</h2>

            {/* Filter Section */}
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded bg-gray-50">
                {columns.filter(col => col.filterable).map(col => (
                    <div key={col.key}>
                        <label htmlFor={`filter-${col.key}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Filter {col.label}
                        </label>
                        <input
                            type={col.key === 'auditDate' ? 'date' : 'text'} // Use date picker for date
                            id={`filter-${col.key}`}
                            name={col.key}
                            value={filterValues[col.key]}
                            onChange={handleFilterChange}
                            placeholder={`Filter by ${col.label}...`}
                            className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                ))}
            </div>

            {/* Table Section */}
            <div className="overflow-x-auto shadow rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    onClick={() => col.sortable && requestSort(col.key)}
                                    className={`px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                                >
                                    {col.label}
                                    {col.sortable && getSortIndicator(col.key)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAndSortedData.length > 0 ? (
                            filteredAndSortedData.map((audit) => (
                                <tr key={audit.id} className="hover:bg-gray-50">
                                    {columns.map(col => (
                                        <td key={col.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                            {/* Format specific columns */}
                                            {col.key === 'createdAt' || col.key === 'updatedAt'
                                                ? formatDisplayDate(audit[col.key]) + ' ' + formatDisplayTime(audit[col.key])
                                                : col.key === 'auditDate'
                                                    ? formatDisplayDate(audit[col.key]) // Format only date part
                                                    : String(audit[col.key] ?? '') // Display value or empty string
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-4 text-gray-500">
                                    No records found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
             <p className="text-sm text-gray-500 mt-2">Displaying {filteredAndSortedData.length} of {allAuditData.length} records.</p>
        </div>
    );
}


// Main App Component (Added Records Tab)
function App() {
  // Start on 'initial' tab by default
  const [activeTab, setActiveTab] = useState('initial');
  useEffect(() => { if (!db) { console.warn("Firebase 'db' instance is not initialized."); } }, []);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'initial': return <InitialCheckForm currentUser="DefaultUser" />;
      case 'confirmation': return <ConfirmationCheck currentUser="DefaultUser" />;
      case 'dashboard': return <Dashboard />;
      // Render RecordsPage for the 'records' tab
      case 'records': return <RecordsPage />;
      default: return <InitialCheckForm currentUser="DefaultUser" />;
    }
  };

  // TabButton component remains the same
  const TabButton = ({ tabId, label }) => (
     <button
        onClick={() => setActiveTab(tabId)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out ${
          activeTab === tabId
            ? 'bg-indigo-600 text-white shadow-md' // Apply brand color: e.g., bg-brand-primary
            : 'text-indigo-700 hover:bg-indigo-100' // Apply brand color: e.g., text-brand-secondary hover:bg-brand-secondary-light
        }`}
      >
        {label}
      </button>
  );


  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-xl"> {/* Increased max-width for wider table */}
        <div className="flex justify-center mb-4"> <img src={xlcLogo} alt="XLC Services Logo" className="h-12 w-auto" /> </div>
        <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-6">Scan Audit Application</h1>
        {/* Updated Tab Navigation */}
        <div className="mb-6 border-b border-gray-200 pb-3 flex justify-center space-x-2 md:space-x-4">
           <TabButton tabId="initial" label="Initial Check" />
           <TabButton tabId="confirmation" label="Confirmation Check" />
           <TabButton tabId="dashboard" label="Dashboard" />
           {/* Added Records Tab */}
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
