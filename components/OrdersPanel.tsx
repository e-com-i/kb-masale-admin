'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  MessageSquare,
  Filter,
  ArrowLeft,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface OrderItem {
  id: number;
  product_name: string;
  product_image: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  line_total: number;
}

interface Order {
  id: number;
  invoice_no: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_country_code: string;
  customer_address: string | null;
  total_items: number;
  total_qty: number;
  subtotal: number;
  discount_savings: number;
  grand_total: number;
  status: string;
  followup_done: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

type OrderStatus = 'received' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';

// ─── Constants ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: any }> = {
  received:   { label: 'Received',   color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  confirmed:  { label: 'Confirmed',  color: 'text-blue-700',   bg: 'bg-blue-100',   icon: CheckCircle },
  dispatched: { label: 'Dispatched', color: 'text-purple-700', bg: 'bg-purple-100', icon: Truck },
  delivered:  { label: 'Delivered',  color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle },
  cancelled:  { label: 'Cancelled',  color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle },
};

const ALL_STATUSES: OrderStatus[] = ['received', 'confirmed', 'dispatched', 'delivered', 'cancelled'];

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

// ─── Component ───────────────────────────────────────────────────

interface OrdersPanelProps {
  onBack: () => void;
}

export default function OrdersPanel({ onBack }: OrdersPanelProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesText, setNotesText] = useState('');

  // ─── Fetch ─────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      params.set('limit', '100');

      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ─── Update helpers ────────────────────────────────────────────

  const updateOrder = async (id: number, updates: Partial<Order>) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev =>
          prev.map(o => (o.id === id ? { ...o, ...updates, updated_at: new Date().toISOString() } : o))
        );
      }
    } catch (err) {
      console.error('Failed to update order:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const saveNotes = (id: number) => {
    updateOrder(id, { admin_notes: notesText });
    setEditingNotesId(null);
  };

  // ─── Stats ─────────────────────────────────────────────────────

  const statusCounts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-sm font-medium">
            {total}
          </span>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
            !statusFilter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({total})
        </button>
        {ALL_STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                statusFilter === s ? `${cfg.bg} ${cfg.color}` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cfg.label} ({statusCounts[s] || 0})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or invoice number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Orders list */}
      {loading && orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const isExpanded = expandedOrder === order.id;
            const cfg = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.received;
            const StatusIcon = cfg.icon;

            return (
              <div key={order.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                {/* Order header row */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-gray-900">{order.invoice_no}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      {order.followup_done && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <Phone className="w-3 h-3" />
                          Followed up
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-gray-900">{formatINR(order.grand_total)}</span>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{order.customer_name}</span>
                    <span>{order.customer_country_code} {order.customer_phone}</span>
                    <span>{order.total_qty} items</span>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 space-y-4">
                    {/* Customer info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${order.customer_country_code}${order.customer_phone}`} className="text-blue-600 hover:underline">
                          {order.customer_country_code} {order.customer_phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a href={`mailto:${order.customer_email}`} className="text-blue-600 hover:underline">
                          {order.customer_email}
                        </a>
                      </div>
                      {order.customer_address && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span>{order.customer_address}</span>
                        </div>
                      )}
                    </div>

                    {/* Items table */}
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Product</th>
                            <th className="text-center px-3 py-2 font-medium text-gray-600">Qty</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">Price</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.order_items?.map((item, i) => (
                            <tr key={item.id || i} className="border-t border-gray-100">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {item.product_image && (
                                    <img src={item.product_image} alt="" className="w-8 h-8 object-contain rounded" />
                                  )}
                                  <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    {item.unit && <p className="text-xs text-gray-400">{item.unit}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">{item.quantity}</td>
                              <td className="px-3 py-2 text-right">{formatINR(item.unit_price)}</td>
                              <td className="px-3 py-2 text-right font-medium">{formatINR(item.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-gray-200">
                          {order.discount_savings > 0 && (
                            <tr>
                              <td colSpan={3} className="px-3 py-1 text-right text-gray-500">Subtotal</td>
                              <td className="px-3 py-1 text-right">{formatINR(order.subtotal)}</td>
                            </tr>
                          )}
                          {order.discount_savings > 0 && (
                            <tr>
                              <td colSpan={3} className="px-3 py-1 text-right text-green-600">Discount</td>
                              <td className="px-3 py-1 text-right text-green-600">-{formatINR(order.discount_savings)}</td>
                            </tr>
                          )}
                          <tr>
                            <td colSpan={3} className="px-3 py-2 text-right font-bold">Grand Total</td>
                            <td className="px-3 py-2 text-right font-bold text-lg">{formatINR(order.grand_total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Actions row */}
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      {/* Status dropdown */}
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-600">Status:</label>
                        <select
                          value={order.status}
                          onChange={e => updateOrder(order.id, { status: e.target.value })}
                          disabled={updatingId === order.id}
                          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {ALL_STATUSES.map(s => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Followup toggle */}
                      <button
                        onClick={() => updateOrder(order.id, { followup_done: !order.followup_done })}
                        disabled={updatingId === order.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          order.followup_done
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } disabled:opacity-50`}
                      >
                        <Phone className="w-4 h-4" />
                        {order.followup_done ? 'Followup Done' : 'Mark Followup'}
                      </button>

                      {/* WhatsApp quick link */}
                      <a
                        href={`https://wa.me/${order.customer_country_code.replace('+', '')}${order.customer_phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition"
                      >
                        WhatsApp
                      </a>
                    </div>

                    {/* Notes */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">Admin Notes</span>
                      </div>
                      {editingNotesId === order.id ? (
                        <div className="flex gap-2">
                          <textarea
                            value={notesText}
                            onChange={e => setNotesText(e.target.value)}
                            rows={2}
                            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="Add notes about this order..."
                          />
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => saveNotes(order.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingNotesId(order.id);
                            setNotesText(order.admin_notes || '');
                          }}
                          className="min-h-[2rem] p-2 border border-dashed rounded-lg text-sm text-gray-500 cursor-pointer hover:bg-gray-50"
                        >
                          {order.admin_notes || 'Click to add notes...'}
                        </div>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="flex gap-4 text-xs text-gray-400 pt-1">
                      <span>Created: {formatDate(order.created_at)}</span>
                      <span>Updated: {formatDate(order.updated_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
