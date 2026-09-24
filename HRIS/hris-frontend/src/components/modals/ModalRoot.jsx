import { useApp } from '../../context/AppContext.jsx';
import AddEmployeeModal from './AddEmployeeModal.jsx';
import EditEmployeeModal from './EditEmployeeModal.jsx';
import LeaveDetailsModal from './LeaveDetailsModal.jsx';

export default function ModalRoot() {
  const { state } = useApp();
  if (!state.modal) return null;
  if (state.modal === 'add-employee') return <AddEmployeeModal />;
  if (state.modal === 'edit-employee') return <EditEmployeeModal />;
  if (state.modal === 'leave-details') return <LeaveDetailsModal />;
  return null;
}
