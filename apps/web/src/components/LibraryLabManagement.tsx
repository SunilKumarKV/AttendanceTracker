import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { createBook, createEquipment, createMaintenance, deleteBook, deleteEquipment, exportLibraryLabReport, getBookIssues, getBooks, getEquipment, getEquipmentIssues, getLibraryLabSummary, getMaintenance, issueBook, issueEquipment, returnBook, returnEquipment, updateMaintenance, type BookIssue, type LabEquipment, type LibraryBook, type LibraryLabSummary, type MaintenanceRequest } from '../api/libraryLab';
import { Loader, EmptyState, ErrorState } from './common';

type Tab = 'books' | 'bookIssues' | 'equipment' | 'equipmentIssues' | 'maintenance';

const initialSummary: LibraryLabSummary = { lowStockBooks: 0, pendingReturns: 0, damagedEquipment: 0, pendingMaintenance: 0 };

export function LibraryLabManagement() {
  const [tab, setTab] = useState<Tab>('books');
  const [summary, setSummary] = useState(initialSummary);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [bookIssues, setBookIssues] = useState<BookIssue[]>([]);
  const [equipment, setEquipment] = useState<LabEquipment[]>([]);
  const [equipmentIssues, setEquipmentIssues] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bookForm, setBookForm] = useState({ title: '', category: '', accessionNumber: '', author: '', publisher: '', isbn: '', totalQuantity: '1', availableQuantity: '1' });
  const [bookIssueForm, setBookIssueForm] = useState({ bookId: '', targetType: 'STUDENT', studentId: '', staffId: '', dueDate: '' });
  const [equipmentForm, setEquipmentForm] = useState({ name: '', category: '', assetCode: '', quantity: '1', availableQuantity: '1', condition: 'GOOD' });
  const [equipmentIssueForm, setEquipmentIssueForm] = useState({ equipmentId: '', targetType: 'STUDENT', studentId: '', staffId: '', courseId: '', sectionId: '', quantity: '1', dueDate: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({ title: '', description: '', equipmentId: '', assignedToId: '', cost: '' });

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, booksRes, bookIssuesRes, equipmentRes, equipmentIssuesRes, maintenanceRes] = await Promise.all([
        getLibraryLabSummary(), getBooks(), getBookIssues().catch(() => ({ data: [] as BookIssue[] })), getEquipment(), getEquipmentIssues().catch(() => ({ data: [] })), getMaintenance().catch(() => ({ data: [] as MaintenanceRequest[] })),
      ]);
      setSummary(summaryRes.data);
      setBooks(booksRes.data);
      setBookIssues(bookIssuesRes.data);
      setEquipment(equipmentRes.data);
      setEquipmentIssues(equipmentIssuesRes.data);
      setMaintenance(maintenanceRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library/lab data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const selectedBook = useMemo(() => books.find((book) => book.id === bookIssueForm.bookId), [books, bookIssueForm.bookId]);
  const selectedEquipment = useMemo(() => equipment.find((item) => item.id === equipmentIssueForm.equipmentId), [equipment, equipmentIssueForm.equipmentId]);

  const submitBook = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createBook({ ...bookForm, totalQuantity: Number(bookForm.totalQuantity), availableQuantity: Number(bookForm.availableQuantity) });
      toast.success('Book added');
      setBookForm({ title: '', category: '', accessionNumber: '', author: '', publisher: '', isbn: '', totalQuantity: '1', availableQuantity: '1' });
      await refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to add book'); } finally { setSaving(false); }
  };

  const submitBookIssue = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await issueBook(bookIssueForm);
      toast.success('Book issued');
      setBookIssueForm({ bookId: '', targetType: 'STUDENT', studentId: '', staffId: '', dueDate: '' });
      await refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to issue book'); } finally { setSaving(false); }
  };

  const submitEquipment = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createEquipment({ ...equipmentForm, quantity: Number(equipmentForm.quantity), availableQuantity: Number(equipmentForm.availableQuantity) });
      toast.success('Equipment added');
      setEquipmentForm({ name: '', category: '', assetCode: '', quantity: '1', availableQuantity: '1', condition: 'GOOD' });
      await refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to add equipment'); } finally { setSaving(false); }
  };

  const submitEquipmentIssue = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await issueEquipment({ ...equipmentIssueForm, quantity: Number(equipmentIssueForm.quantity) });
      toast.success('Equipment issued');
      setEquipmentIssueForm({ equipmentId: '', targetType: 'STUDENT', studentId: '', staffId: '', courseId: '', sectionId: '', quantity: '1', dueDate: '' });
      await refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to issue equipment'); } finally { setSaving(false); }
  };

  const submitMaintenance = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createMaintenance(maintenanceForm);
      toast.success('Maintenance request created');
      setMaintenanceForm({ title: '', description: '', equipmentId: '', assignedToId: '', cost: '' });
      await refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to create maintenance request'); } finally { setSaving(false); }
  };

  const downloadReport = async (type: string, format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      const content = await exportLibraryLabReport(type, format);
      const mime = format === 'pdf' ? 'application/pdf' : format === 'xlsx' ? 'application/vnd.ms-excel' : 'text/csv';
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}.${format === 'xlsx' ? 'xls' : format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export report');
    }
  };

  if (loading) return <Loader label="Loading library and lab management..." />;
  if (error) return <ErrorState title="Could not load library/lab module" message={error} onRetry={refresh} />;

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Version 1.8</p>
          <h1>Library, Lab & Maintenance</h1>
          <p>Manage books, book issues, lab equipment, equipment responsibility and maintenance requests.</p>
        </div>
        <button className="btn secondary" onClick={refresh}>Refresh</button>
      </header>

      <section className="stats-grid">
        <article className="stat-card"><span>Low stock books</span><strong>{summary.lowStockBooks}</strong></article>
        <article className="stat-card"><span>Pending returns</span><strong>{summary.pendingReturns}</strong></article>
        <article className="stat-card"><span>Damaged equipment</span><strong>{summary.damagedEquipment}</strong></article>
        <article className="stat-card"><span>Pending maintenance</span><strong>{summary.pendingMaintenance}</strong></article>
      </section>

      <nav className="tab-bar">
        {(['books','bookIssues','equipment','equipmentIssues','maintenance'] as Tab[]).map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item.replace(/([A-Z])/g, ' $1')}</button>)}
      </nav>

      <section className="card">
        <h2>Reports</h2>
        <div className="actions-row">
          {['book-stock','book-issues','equipment-stock','equipment-issues','maintenance'].map((type) => (
            <span key={type} className="inline-actions">
              <button className="btn secondary" onClick={() => downloadReport(type, 'csv')}>{type} CSV</button>
              <button className="btn secondary" onClick={() => downloadReport(type, 'pdf')}>{type} PDF</button>
            </span>
          ))}
        </div>
      </section>

      {tab === 'books' && <section className="content-grid"><form className="card form-grid" onSubmit={submitBook}><h2>Add Book</h2><input required placeholder="Title" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} /><input required placeholder="Category" value={bookForm.category} onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })} /><input required placeholder="Accession number" value={bookForm.accessionNumber} onChange={(e) => setBookForm({ ...bookForm, accessionNumber: e.target.value })} /><input placeholder="Author" value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} /><input placeholder="Publisher" value={bookForm.publisher} onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })} /><input placeholder="ISBN" value={bookForm.isbn} onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })} /><input type="number" min="1" placeholder="Total quantity" value={bookForm.totalQuantity} onChange={(e) => setBookForm({ ...bookForm, totalQuantity: e.target.value })} /><input type="number" min="0" placeholder="Available quantity" value={bookForm.availableQuantity} onChange={(e) => setBookForm({ ...bookForm, availableQuantity: e.target.value })} /><button disabled={saving} className="btn">Add book</button></form><DataTable rows={books} empty="No books added yet" columns={[['Title','title'],['Category','category'],['Accession','accessionNumber'],['Available','availableQuantity']]} action={(book: LibraryBook) => <button className="btn danger" onClick={async () => { await deleteBook(book.id); await refresh(); }}>Delete</button>} /></section>}

      {tab === 'bookIssues' && <section className="content-grid"><form className="card form-grid" onSubmit={submitBookIssue}><h2>Issue Book</h2><select required value={bookIssueForm.bookId} onChange={(e) => setBookIssueForm({ ...bookIssueForm, bookId: e.target.value })}><option value="">Select book</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title} ({book.availableQuantity} available)</option>)}</select><select value={bookIssueForm.targetType} onChange={(e) => setBookIssueForm({ ...bookIssueForm, targetType: e.target.value })}><option value="STUDENT">Student</option><option value="STAFF">Staff</option></select>{bookIssueForm.targetType === 'STUDENT' ? <input required placeholder="Student ID" value={bookIssueForm.studentId} onChange={(e) => setBookIssueForm({ ...bookIssueForm, studentId: e.target.value })} /> : <input required placeholder="Staff ID" value={bookIssueForm.staffId} onChange={(e) => setBookIssueForm({ ...bookIssueForm, staffId: e.target.value })} />}<input required type="date" value={bookIssueForm.dueDate} onChange={(e) => setBookIssueForm({ ...bookIssueForm, dueDate: e.target.value })} /><small>{selectedBook ? `${selectedBook.availableQuantity} copies available` : 'Select a book to issue'}</small><button disabled={saving} className="btn">Issue book</button></form><DataTable rows={bookIssues} empty="No book issues" columns={[['Book','book.title'],['Target','targetType'],['Status','status'],['Due','dueDate']]} action={(issue: BookIssue) => issue.status !== 'RETURNED' ? <button className="btn" onClick={async () => { await returnBook(issue.id); await refresh(); }}>Return</button> : null} /></section>}

      {tab === 'equipment' && <section className="content-grid"><form className="card form-grid" onSubmit={submitEquipment}><h2>Add Equipment</h2><input required placeholder="Name" value={equipmentForm.name} onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })} /><input required placeholder="Category" value={equipmentForm.category} onChange={(e) => setEquipmentForm({ ...equipmentForm, category: e.target.value })} /><input required placeholder="Asset code" value={equipmentForm.assetCode} onChange={(e) => setEquipmentForm({ ...equipmentForm, assetCode: e.target.value })} /><input type="number" min="1" value={equipmentForm.quantity} onChange={(e) => setEquipmentForm({ ...equipmentForm, quantity: e.target.value })} /><input type="number" min="0" value={equipmentForm.availableQuantity} onChange={(e) => setEquipmentForm({ ...equipmentForm, availableQuantity: e.target.value })} /><select value={equipmentForm.condition} onChange={(e) => setEquipmentForm({ ...equipmentForm, condition: e.target.value })}><option value="GOOD">Good</option><option value="DAMAGED">Damaged</option><option value="UNDER_REPAIR">Under repair</option></select><button disabled={saving} className="btn">Add equipment</button></form><DataTable rows={equipment} empty="No equipment added" columns={[['Name','name'],['Asset','assetCode'],['Condition','condition'],['Available','availableQuantity']]} action={(item: LabEquipment) => <button className="btn danger" onClick={async () => { await deleteEquipment(item.id); await refresh(); }}>Delete</button>} /></section>}

      {tab === 'equipmentIssues' && <section className="content-grid"><form className="card form-grid" onSubmit={submitEquipmentIssue}><h2>Issue Equipment</h2><select required value={equipmentIssueForm.equipmentId} onChange={(e) => setEquipmentIssueForm({ ...equipmentIssueForm, equipmentId: e.target.value })}><option value="">Select equipment</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.availableQuantity} available)</option>)}</select><select value={equipmentIssueForm.targetType} onChange={(e) => setEquipmentIssueForm({ ...equipmentIssueForm, targetType: e.target.value })}><option value="STUDENT">Student</option><option value="STAFF">Staff</option><option value="CLASS">Class</option></select>{equipmentIssueForm.targetType === 'STUDENT' && <input required placeholder="Student ID" value={equipmentIssueForm.studentId} onChange={(e) => setEquipmentIssueForm({ ...equipmentIssueForm, studentId: e.target.value })} />}{equipmentIssueForm.targetType === 'STAFF' && <input required placeholder="Staff ID" value={equipmentIssueForm.staffId} onChange={(e) => setEquipmentIssueForm({ ...equipmentIssueForm, staffId: e.target.value })} />}{equipmentIssueForm.targetType === 'CLASS' && <><input required placeholder="Course ID" value={equipmentIssueForm.courseId} onChange={(e) => setEquipmentIssueForm({ ...equipmentIssueForm, courseId: e.target.value })} /><input required placeholder="Section ID" value={equipmentIssueForm.sectionId} onChange={(e) => setEquipmentIssueForm({ ...equipmentIssueForm, sectionId: e.target.value })} /></>}<input type="number" min="1" value={equipmentIssueForm.quantity} onChange={(e) => setEquipmentIssueForm({ ...equipmentIssueForm, quantity: e.target.value })} /><input type="date" value={equipmentIssueForm.dueDate} onChange={(e) => setEquipmentIssueForm({ ...equipmentIssueForm, dueDate: e.target.value })} /><small>{selectedEquipment ? `${selectedEquipment.availableQuantity} items available` : 'Select equipment to issue'}</small><button disabled={saving} className="btn">Issue equipment</button></form><DataTable rows={equipmentIssues} empty="No equipment issues" columns={[['Equipment','equipment.name'],['Target','targetType'],['Qty','quantity'],['Status','status']]} action={(issue: any) => issue.status !== 'RETURNED' ? <button className="btn" onClick={async () => { await returnEquipment(issue.id); await refresh(); }}>Return</button> : null} /></section>}

      {tab === 'maintenance' && <section className="content-grid"><form className="card form-grid" onSubmit={submitMaintenance}><h2>Create Maintenance Request</h2><input required placeholder="Title" value={maintenanceForm.title} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })} /><textarea required placeholder="Description" value={maintenanceForm.description} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })} /><select value={maintenanceForm.equipmentId} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, equipmentId: e.target.value })}><option value="">General request</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input placeholder="Assigned user ID" value={maintenanceForm.assignedToId} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, assignedToId: e.target.value })} /><input type="number" min="0" placeholder="Cost" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} /><button disabled={saving} className="btn">Create request</button></form><DataTable rows={maintenance} empty="No maintenance requests" columns={[['Title','title'],['Equipment','equipment.name'],['Status','status'],['Cost','cost']]} action={(item: MaintenanceRequest) => item.status !== 'RESOLVED' ? <button className="btn" onClick={async () => { await updateMaintenance(item.id, { status: 'RESOLVED' }); await refresh(); }}>Resolve</button> : null} /></section>}
    </main>
  );
}

function getValue(row: any, path: string) { return path.split('.').reduce((value, key) => value?.[key], row) ?? '—'; }
function DataTable<T extends { id: string }>({ rows, columns, empty, action }: { rows: T[]; columns: [string, string][]; empty: string; action?: (row: T) => ReactNode }) {
  if (!rows.length) return <div className="card"><EmptyState title={empty} message="Records will appear here after you create them." /></div>;
  return <div className="card table-card"><table><thead><tr>{columns.map(([label]) => <th key={label}>{label}</th>)}{action && <th>Action</th>}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map(([label, key]) => <td key={label}>{String(getValue(row, key)).slice(0, 80)}</td>)}{action && <td>{action(row)}</td>}</tr>)}</tbody></table></div>;
}
