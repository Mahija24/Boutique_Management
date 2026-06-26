import { useState, useEffect } from 'react';
import api from '../api/axios';

const parseDate = (v) => {
  if (!v) return null;
  return typeof v === 'string' ? new Date(v) : new Date(v);
};

const getItemStageForDate = (item, selectedDate) => {
  if (!item?.aiSchedule) return 'No schedule';
  const target = parseDate(selectedDate);
  if (!target || isNaN(target)) return 'Invalid date';
  const cuttingEnd = parseDate(item.aiSchedule?.cutting?.endDate);
  const stitchingEnd = parseDate(item.aiSchedule?.stitching?.endDate);
  const trialEnd = parseDate(item.aiSchedule?.trial?.endDate);
  const finalEnd = parseDate(item.aiSchedule?.finalWork?.endDate);
  if (cuttingEnd && target <= cuttingEnd) return 'Cutting';
  if (stitchingEnd && target <= stitchingEnd) return 'Stitching';
  if (trialEnd && target <= trialEnd) return 'Trial';
  if (finalEnd && target <= finalEnd) return 'Final adjustment';
  return item.itemStatus === 'Delivered' ? 'Delivered' : 'Ready';
};

export default function TaskAnalyzer() {
  const [orders, setOrders] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/orders');
        setOrders(data || []);
      } catch (e) {
        console.error('Failed to fetch orders for analyzer', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const itemsWithStage = orders.flatMap((order) =>
    (order.items || []).map((item) => ({
      orderId: order.orderId || order._id,
      deliveryDate: item.deliveryDate || order.deliveryDate,
      product: item.productType || item.designType || 'Item',
      stage: getItemStageForDate(item, date),
    })),
  );

  const grouped = itemsWithStage.reduce((acc, it) => {
    acc[it.stage] = acc[it.stage] || [];
    acc[it.stage].push(it);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Task Analyzer</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Select date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded p-2" />
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.keys(grouped).length === 0 ? (
            <div className="col-span-full text-sm text-gray-500">No items found for selected date.</div>
          ) : (
            Object.entries(grouped).map(([stage, items]) => (
              <div key={stage} className="bg-white rounded-lg p-4 border">
                <h3 className="font-semibold mb-2">{stage} <span className="text-sm text-gray-400">({items.length})</span></h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  {items.slice(0, 20).map((it, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{it.product} — {it.orderId}</span>
                      <span className="text-xs text-gray-500">{new Date(it.deliveryDate).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
