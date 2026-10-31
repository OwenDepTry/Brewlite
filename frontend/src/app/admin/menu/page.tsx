'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { PageHeader } from '@/components/admin/WorkShell';
import { Modal } from '@/components/Modal';
import { ErrorView, Spinner } from '@/components/StateViews';
import { api, imageSrc } from '@/lib/api';
import { formatVND } from '@/lib/format';
import type { AdminProduct, AdminTopping } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';

/** Ảnh minh họa có sẵn trong frontend/public/images */
const IMAGE_PRESETS = [
  '/images/ca-phe-sua.svg',
  '/images/bac-xiu.svg',
  '/images/americano.svg',
  '/images/cappuccino.svg',
  '/images/latte.svg',
  '/images/tra-dao.svg',
  '/images/tra-sua.svg',
  '/images/matcha.svg',
];

interface ProductForm {
  name: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string;
  stock: string;
}

const EMPTY_FORM: ProductForm = { name: '', description: '', category: 'Cà phê', price: '', imageUrl: IMAGE_PRESETS[0], stock: '20' };

export default function AdminMenuPage() {
  const token = useAuth((s) => s.token);
  const queryClient = useQueryClient();

  const products = useQuery({ queryKey: ['admin', 'products'], queryFn: () => api<AdminProduct[]>('/admin/products', { token }) });
  const toppings = useQuery({ queryKey: ['admin', 'toppings'], queryFn: () => api<AdminTopping[]>('/admin/toppings', { token }) });

  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [stockFor, setStockFor] = useState<AdminProduct | null>(null);
  const [delta, setDelta] = useState('10');
  const [toppingEdit, setToppingEdit] = useState<AdminTopping | 'new' | null>(null);
  const [toppingForm, setToppingForm] = useState({ name: '', price: '' });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const saveProduct = useMutation({
    mutationFn: (payload: { id?: number; body: Record<string, unknown> }) =>
      payload.id
        ? api<AdminProduct>(`/admin/products/${payload.id}`, { method: 'PATCH', token, body: payload.body })
        : api<AdminProduct>('/admin/products', { method: 'POST', token, body: payload.body }),
    onSuccess: (p: AdminProduct) => {
      toast(editing === 'new' ? `Đã thêm ${p.name}` : `Đã lưu ${p.name}`);
      setEditing(null);
      refresh();
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  const toggleProduct = useMutation({
    mutationFn: (p: AdminProduct) => api<AdminProduct>(`/admin/products/${p.id}`, { method: 'PATCH', token, body: { isActive: !p.isActive } }),
    onSuccess: (p: AdminProduct) => {
      toast(p.isActive ? `${p.name} đã hiện lại trên menu` : `Đã ẩn ${p.name} khỏi menu`);
      refresh();
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  const adjustStock = useMutation({
    mutationFn: ({ id, value }: { id: number; value: number }) =>
      api<AdminProduct>(`/admin/products/${id}/stock`, { method: 'POST', token, body: { delta: value } }),
    onSuccess: (p: AdminProduct) => {
      toast(`${p.name} còn ${p.stock} ly`);
      setStockFor(null);
      refresh();
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  const saveTopping = useMutation({
    mutationFn: (payload: { id?: number; body: Record<string, unknown> }) =>
      payload.id
        ? api<AdminTopping>(`/admin/toppings/${payload.id}`, { method: 'PATCH', token, body: payload.body })
        : api<AdminTopping>('/admin/toppings', { method: 'POST', token, body: payload.body }),
    onSuccess: (t: AdminTopping) => {
      toast(`Đã lưu topping ${t.name}`);
      setToppingEdit(null);
      refresh();
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  const openEdit = (p: AdminProduct | 'new') => {
    setEditing(p);
    setForm(
      p === 'new'
        ? EMPTY_FORM
        : { name: p.name, description: p.description, category: p.category, price: String(p.price), imageUrl: p.imageUrl, stock: String(p.stock) },
    );
  };

  const submitProduct = (e: FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      name: form.name,
      description: form.description,
      category: form.category,
      price: Number(form.price),
      imageUrl: form.imageUrl,
    };
    if (editing === 'new') body.stock = Number(form.stock || 0);
    saveProduct.mutate({ id: editing === 'new' || !editing ? undefined : editing.id, body });
  };

  const submitTopping = (e: FormEvent) => {
    e.preventDefault();
    saveTopping.mutate({
      id: toppingEdit === 'new' || !toppingEdit ? undefined : toppingEdit.id,
      body: { name: toppingForm.name, price: Number(toppingForm.price) },
    });
  };

  if (products.isLoading) return <Spinner />;
  if (products.isError) return <ErrorView message={(products.error as Error).message} onRetry={() => products.refetch()} />;

  const categories = Array.from(new Set((products.data ?? []).map((p) => p.category)));

  return (
    <div>
      <PageHeader
        title="Menu & tồn kho"
        description="Món bị ẩn không hiện với khách nhưng vẫn giữ trong lịch sử đơn."
        actions={
          <button type="button" className="btn-primary" onClick={() => openEdit('new')}>
            Thêm đồ uống
          </button>
        }
      />

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Đồ uống</th>
                <th>Danh mục</th>
                <th className="text-right">Giá size S</th>
                <th className="text-right">Tồn kho</th>
                <th>Trên menu</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(products.data ?? []).map((p) => (
                <tr key={p.id} className={p.isActive ? '' : 'text-ink-mute'}>
                  <td>
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageSrc(p.imageUrl)} alt="" className={`h-11 w-11 rounded-xl bg-jade-50 object-cover ${p.isActive ? '' : 'opacity-50 grayscale'}`} />
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td className="text-right tabular">{formatVND(p.price)}</td>
                  <td className="text-right">
                    <span className={`font-semibold tabular ${p.stock === 0 ? 'text-brick-600' : p.stock <= 10 ? 'text-milk-600' : ''}`}>{p.stock}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.isActive}
                      aria-label={`${p.isActive ? 'Ẩn' : 'Hiện'} ${p.name}`}
                      disabled={toggleProduct.isPending}
                      onClick={() => toggleProduct.mutate(p)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${p.isActive ? 'bg-jade-500' : 'bg-line'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${p.isActive ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button
                      type="button"
                      className="btn-outline btn-sm mr-2"
                      onClick={() => {
                        setStockFor(p);
                        setDelta('10');
                      }}
                    >
                      Nhập kho
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => openEdit(p)}>
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold">Topping</h2>
            <p className="text-sm text-ink-soft">Dùng chung cho mọi đồ uống.</p>
          </div>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setToppingEdit('new');
              setToppingForm({ name: '', price: '' });
            }}
          >
            Thêm topping
          </button>
        </div>
        <div className="panel overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th className="text-right">Giá thêm</th>
                <th>Đang bán</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(toppings.data ?? []).map((t) => (
                <tr key={t.id} className={t.isActive ? '' : 'text-ink-mute'}>
                  <td className="font-medium">{t.name}</td>
                  <td className="text-right tabular">+{formatVND(t.price)}</td>
                  <td>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={t.isActive}
                      aria-label={`${t.isActive ? 'Ngừng bán' : 'Bán lại'} ${t.name}`}
                      onClick={() => saveTopping.mutate({ id: t.id, body: { isActive: !t.isActive } })}
                      className={`relative h-6 w-11 rounded-full transition-colors ${t.isActive ? 'bg-jade-500' : 'bg-line'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${t.isActive ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        setToppingEdit(t);
                        setToppingForm({ name: t.name, price: String(t.price) });
                      }}
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Thêm / sửa đồ uống ---- */}
      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Thêm đồ uống' : `Sửa ${editing ? editing.name : ''}`}
        onClose={() => setEditing(null)}
        wide
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
              Hủy
            </button>
            <button type="submit" form="product-form" className="btn-primary" disabled={saveProduct.isPending}>
              {saveProduct.isPending ? 'Đang lưu…' : editing === 'new' ? 'Thêm vào menu' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={submitProduct} className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="field-label">Tên đồ uống</span>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
          </label>
          <label className="block">
            <span className="field-label">Danh mục</span>
            <input className="input" list="category-options" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required maxLength={50} />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="field-label">Giá size S (đ)</span>
            <input className="input tabular" type="number" min={1000} step={1000} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <span className="field-hint">Size M cộng 5.000đ, size L cộng 10.000đ.</span>
          </label>
          <label className="block sm:col-span-2">
            <span className="field-label">Mô tả</span>
            <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
          </label>
          {editing === 'new' && (
            <label className="block">
              <span className="field-label">Tồn kho ban đầu (ly)</span>
              <input className="input tabular" type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </label>
          )}
          <fieldset className="sm:col-span-2">
            <legend className="field-label">Ảnh</legend>
            <div className="flex flex-wrap gap-2">
              {IMAGE_PRESETS.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setForm({ ...form, imageUrl: src })}
                  aria-pressed={form.imageUrl === src}
                  className={`overflow-hidden rounded-xl border-2 ${form.imageUrl === src ? 'border-jade-500' : 'border-transparent'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-14 w-14 bg-jade-50 object-cover" />
                </button>
              ))}
            </div>
            <input
              className="input mt-2"
              placeholder="Hoặc dán đường dẫn ảnh (https://…)"
              value={IMAGE_PRESETS.includes(form.imageUrl) ? '' : form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              maxLength={255}
            />
          </fieldset>
        </form>
      </Modal>

      {/* ---- Nhập / trừ kho ---- */}
      <Modal
        open={stockFor !== null}
        title={stockFor ? `Tồn kho ${stockFor.name}` : ''}
        onClose={() => setStockFor(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setStockFor(null)}>
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={adjustStock.isPending || !Number(delta)}
              onClick={() => stockFor && adjustStock.mutate({ id: stockFor.id, value: Number(delta) })}
            >
              {Number(delta) < 0 ? `Trừ ${Math.abs(Number(delta))} ly` : `Nhập thêm ${Number(delta) || 0} ly`}
            </button>
          </>
        }
      >
        {stockFor && (
          <div>
            <p className="text-sm text-ink-soft">
              Hiện còn <span className="font-semibold text-ink tabular">{stockFor.stock}</span> ly. Nhập số dương để thêm hàng, số âm để trừ hao hụt.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[10, 20, 50, -5].map((n) => (
                <button key={n} type="button" className={`chip ${Number(delta) === n ? 'chip-active' : ''}`} onClick={() => setDelta(String(n))}>
                  {n > 0 ? `+${n}` : n}
                </button>
              ))}
            </div>
            <label className="mt-4 block">
              <span className="field-label">Số ly điều chỉnh</span>
              <input className="input tabular" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
            </label>
            <p className="mt-2 text-sm text-ink-mute">
              Sau khi lưu: <span className="font-semibold text-ink tabular">{Math.max(0, stockFor.stock + (Number(delta) || 0))}</span> ly
            </p>
          </div>
        )}
      </Modal>

      {/* ---- Topping ---- */}
      <Modal
        open={toppingEdit !== null}
        title={toppingEdit === 'new' ? 'Thêm topping' : 'Sửa topping'}
        onClose={() => setToppingEdit(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setToppingEdit(null)}>
              Hủy
            </button>
            <button type="submit" form="topping-form" className="btn-primary" disabled={saveTopping.isPending}>
              Lưu topping
            </button>
          </>
        }
      >
        <form id="topping-form" onSubmit={submitTopping} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Tên</span>
            <input className="input" value={toppingForm.name} onChange={(e) => setToppingForm({ ...toppingForm, name: e.target.value })} required maxLength={100} />
          </label>
          <label className="block">
            <span className="field-label">Giá thêm (đ)</span>
            <input className="input tabular" type="number" min={0} step={1000} value={toppingForm.price} onChange={(e) => setToppingForm({ ...toppingForm, price: e.target.value })} required />
          </label>
        </form>
      </Modal>
    </div>
  );
}
