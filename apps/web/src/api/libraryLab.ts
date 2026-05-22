import { apiClient } from './client';

interface ApiResponse<T> { success: boolean; data: T }
const qs = (params: Record<string, string | number | undefined> = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)); });
  const value = search.toString();
  return value ? `?${value}` : '';
};

export type LibraryBook = { id: string; title: string; category: string; author?: string; publisher?: string; isbn?: string; accessionNumber: string; totalQuantity: number; availableQuantity: number; isActive: boolean };
export type BookIssue = { id: string; book?: LibraryBook; targetType: string; status: string; dueDate: string; issueDate: string; student?: { name: string }; staff?: { user?: { name: string } } };
export type LabEquipment = { id: string; name: string; category: string; assetCode: string; quantity: number; availableQuantity: number; condition: string; lab?: { name: string } };
export type EquipmentIssue = { id: string; equipment?: LabEquipment; targetType: string; status: string; quantity: number; issueDate: string };
export type MaintenanceRequest = { id: string; title: string; description: string; status: string; cost?: string | number; equipment?: LabEquipment; assignedTo?: { name: string } };
export type LibraryLabSummary = { lowStockBooks: number; pendingReturns: number; damagedEquipment: number; pendingMaintenance: number };

export const getLibraryLabSummary = () => apiClient<ApiResponse<LibraryLabSummary>>('/library-lab/dashboard');
export const getBooks = (params: Record<string, string | number | undefined> = {}) => apiClient<ApiResponse<LibraryBook[]>>(`/library-lab/books${qs(params)}`);
export const createBook = (data: Partial<LibraryBook>) => apiClient<ApiResponse<LibraryBook>>('/library-lab/books', { method: 'POST', body: JSON.stringify(data) });
export const updateBook = (id: string, data: Partial<LibraryBook>) => apiClient<ApiResponse<LibraryBook>>(`/library-lab/books/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteBook = (id: string) => apiClient<void>(`/library-lab/books/${id}`, { method: 'DELETE' });
export const getBookIssues = () => apiClient<ApiResponse<BookIssue[]>>('/library-lab/book-issues');
export const issueBook = (data: Record<string, unknown>) => apiClient<ApiResponse<BookIssue>>('/library-lab/book-issues', { method: 'POST', body: JSON.stringify(data) });
export const returnBook = (id: string, data: Record<string, unknown> = {}) => apiClient<ApiResponse<BookIssue>>(`/library-lab/book-issues/${id}/return`, { method: 'POST', body: JSON.stringify(data) });
export const getEquipment = (params: Record<string, string | number | undefined> = {}) => apiClient<ApiResponse<LabEquipment[]>>(`/library-lab/equipment${qs(params)}`);
export const createEquipment = (data: Partial<LabEquipment>) => apiClient<ApiResponse<LabEquipment>>('/library-lab/equipment', { method: 'POST', body: JSON.stringify(data) });
export const updateEquipment = (id: string, data: Partial<LabEquipment>) => apiClient<ApiResponse<LabEquipment>>(`/library-lab/equipment/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteEquipment = (id: string) => apiClient<void>(`/library-lab/equipment/${id}`, { method: 'DELETE' });
export const getEquipmentIssues = () => apiClient<ApiResponse<EquipmentIssue[]>>('/library-lab/equipment-issues');
export const issueEquipment = (data: Record<string, unknown>) => apiClient<ApiResponse<EquipmentIssue>>('/library-lab/equipment-issues', { method: 'POST', body: JSON.stringify(data) });
export const returnEquipment = (id: string, data: Record<string, unknown> = {}) => apiClient<ApiResponse<EquipmentIssue>>(`/library-lab/equipment-issues/${id}/return`, { method: 'POST', body: JSON.stringify(data) });
export const getMaintenance = () => apiClient<ApiResponse<MaintenanceRequest[]>>('/library-lab/maintenance');
export const createMaintenance = (data: Record<string, unknown>) => apiClient<ApiResponse<MaintenanceRequest>>('/library-lab/maintenance', { method: 'POST', body: JSON.stringify(data) });
export const updateMaintenance = (id: string, data: Record<string, unknown>) => apiClient<ApiResponse<MaintenanceRequest>>(`/library-lab/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const exportLibraryLabReport = (type: string, format: 'csv' | 'xlsx' | 'pdf') => apiClient<string>(`/library-lab/reports/export${qs({ type, format })}`);
