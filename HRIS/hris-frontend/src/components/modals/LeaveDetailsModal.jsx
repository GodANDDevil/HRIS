import { useApp } from '../../context/AppContext.jsx';
import Modal from '../ui/Modal.jsx';
import Badge, { statusVariant } from '../ui/Badge.jsx';
import { leaveTypeLabel, fmtDate } from '../../lib/mockData.js';

export default function LeaveDetailsModal() {
  const { state, dispatch, toast } = useApp();
  const leave = state.leaveRequests.find(l => l.id === state.leaveDetailsId);

  if (!leave) return null;

  function approve() {
    dispatch({ type: 'APPROVE_LEAVE', id: leave.id });
    dispatch({ type: 'CLOSE_MODAL' });
    toast('success', 'Leave approved', `${leave.empName}'s leave request has been approved.`);
  }

  function reject() {
    dispatch({ type: 'REJECT_LEAVE', id: leave.id });
    dispatch({ type: 'CLOSE_MODAL' });
    toast('info', 'Leave rejected', `${leave.empName}'s leave request has been rejected.`);
  }

  return (
    <Modal
      title="Leave request details"
      onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
      footer={
        <>
          <button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
            className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-surface text-ink-soft border border-border hover:bg-bg transition-colors">
            Close
          </button>
          {leave.status === 'Pending' && (
            <>
              <button onClick={reject}
                className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-danger text-white hover:bg-danger-700 transition-colors">
                Reject
              </button>
              <button onClick={approve}
                className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-success text-white hover:bg-success-700 transition-colors">
                Approve
              </button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4 text-[13.5px]">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-semibold text-[15px]">{leave.empName}</div>
            <div className="text-ink-mute font-mono text-[12px]">{leave.empId}</div>
          </div>
          <Badge variant={statusVariant(leave.status)}>{leave.status}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div><div className="text-ink-mute text-[11.5px] mb-1">Leave type</div><div className="font-semibold">{leaveTypeLabel(leave.type)}</div></div>
          <div><div className="text-ink-mute text-[11.5px] mb-1">Days</div><div className="font-mono font-semibold">{leave.days}</div></div>
          <div><div className="text-ink-mute text-[11.5px] mb-1">Start date</div><div className="font-mono">{leave.start}</div></div>
          <div><div className="text-ink-mute text-[11.5px] mb-1">End date</div><div className="font-mono">{leave.end}</div></div>
          <div><div className="text-ink-mute text-[11.5px] mb-1">Submitted</div><div className="font-mono">{leave.submitted}</div></div>
          {leave.attachment && (
            <div><div className="text-ink-mute text-[11.5px] mb-1">Attachment</div><div className="text-primary font-semibold">{leave.attachment}</div></div>
          )}
        </div>
        <div>
          <div className="text-ink-mute text-[11.5px] mb-1">Reason</div>
          <div className="bg-bg rounded-[10px] px-3 py-2.5 text-[13px] leading-relaxed">{leave.reason}</div>
        </div>
      </div>
    </Modal>
  );
}
