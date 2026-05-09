export const roleText = { USER: '普通用户', SUPPLIER: '供应方', AUDITOR: '审核员', FINANCE: '财务管理员', ADMIN: '管理员' };
export const statusText = {
  ACTIVE: '启用',
  DISABLED: '禁用',
  INACTIVE: '停用',
  PENDING_QUOTE: '待报价',
  QUOTED: '已报价',
  APPROVED: '已审核',
  PROCESSING: '处理中',
  SHIPPED: '已发货',
  COMPLETED: '已完成',
  REFUNDED: '已退款',
  CANCELLED: '已取消',
  PENDING: '待审核',
  REJECTED: '已驳回',
  UNPAID: '待结算',
  PAID: '已结算'
};
export const applicationTypeText = { PURCHASE: '采购申请', QUOTA: '额度申请', REIMBURSEMENT: '报销申请' };
export const notificationTypeText = { SYSTEM: '系统', ORDER: '订单', APPLICATION: '申请', PAYMENT: '结算' };
export const money = (value) => `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const dateTime = (value) => (value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-');
export const dateOnly = (value) => (value ? new Date(value).toLocaleDateString('zh-CN') : '-');
export const statusType = (status) => {
  if (['ACTIVE', 'APPROVED', 'COMPLETED', 'PAID'].includes(status)) return 'success';
  if (['PENDING', 'PENDING_QUOTE', 'QUOTED', 'PROCESSING', 'UNPAID'].includes(status)) return 'warning';
  if (['REJECTED', 'REFUNDED', 'CANCELLED', 'DISABLED', 'INACTIVE'].includes(status)) return 'danger';
  return 'info';
};
