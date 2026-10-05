import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PhotoPicker } from './PhotoPicker';
import { bad, errorText, field, label, ok } from './formStyles';
import { Switch } from '../Switch';
import { usePhotoDraft } from '../../hooks/usePhotoDraft';
import { productCategories } from '../../data/productCategories';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_IMAGES_MAX,
  parsePrice,
  parseStock,
  quantityError,
  validateProductFields,
  type ProductFieldErrors } from
'../../utils/products';
import type { NewProductInput, ProductCategory } from '../../types/marketplace';

interface ProductFormProps {
  /** Omit to create a new product. */
  initial?: NewProductInput;
  onSave: (input: NewProductInput) => void;
  onDelete?: () => void;
  cancelTo: string;
}

const FIELD_ORDER: (keyof ProductFieldErrors)[] = ['images', 'name', 'category', 'price', 'stock', 'lowStockThreshold', 'description'];
const fieldId = (key: keyof ProductFieldErrors) => `product-${key}`;

function formatDigits(v: string): string {
  const digits = v.replace(/[^\d]/g, '');
  return digits ? Number(digits).toLocaleString('en-NG') : '';
}

export function ProductForm({ initial, onSave, onDelete, cancelTo }: ProductFormProps) {
  const isNew = !initial;
  const photos = usePhotoDraft(initial?.images ?? [], PRODUCT_IMAGES_MAX);
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<ProductCategory | ''>(initial?.category ?? '');
  const [price, setPrice] = useState(initial ? formatDigits(String(initial.price)) : '');
  const [stock, setStock] = useState(initial ? String(initial.stock) : '');
  const [lowStockThreshold, setLowStockThreshold] = useState(String(initial?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD));
  const [description, setDescription] = useState(initial?.description ?? '');
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [errors, setErrors] = useState<ProductFieldErrors>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const clear = (key: keyof ProductFieldErrors) => errors[key] && setErrors((prev) => ({ ...prev, [key]: undefined }));
  const descriptionLength = description.trim().length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedPrice = price.trim() ? parsePrice(price) : null;
    const parsedStock = stock.trim() ? parseStock(stock) : null;
    const parsedThreshold = parseStock(lowStockThreshold);
    // A photo is required for new products, and for any product customers can see.
    // Imported products without photos can still be edited while hidden.
    const requireImage = isNew || available;
    const next = validateProductFields(
      { name, category: category || null, price: parsedPrice, stock: parsedStock, description, images: photos.photos },
      { requireImage }
    );
    if (!price.trim()) next.price = 'Add a price.';
    if (!stock.trim()) next.stock = 'Add how many you have in stock.';else
    next.stock = quantityError(stock) ?? next.stock;
    const thresholdError = quantityError(lowStockThreshold, 'Low-stock level');
    if (thresholdError) next.lowStockThreshold = thresholdError;
    if (next.images && !isNew && photos.photos.length === 0) next.images = 'Add at least one photo, or turn off Available.';
    setErrors(next);

    const firstError = FIELD_ORDER.find((k) => next[k]);
    if (firstError) {
      document.getElementById(fieldId(firstError))?.focus();
      return;
    }
    if (!category || parsedPrice === null || parsedStock === null || parsedThreshold === null) return;
    onSave({
      name: name.trim(),
      category,
      price: parsedPrice,
      stock: parsedStock,
      lowStockThreshold: parsedThreshold,
      description: description.trim(),
      images: photos.commit(),
      available
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={isNew ? 'New product' : `Edit ${initial.name}`} className="space-y-6">
      <section aria-labelledby="product-photos-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
        <h2 id="product-photos-heading" className="text-base font-bold text-ink">
          Photos <span className="text-clay-dark" aria-hidden="true">*</span>
        </h2>
        <p className="mb-4 mt-0.5 text-sm text-muted">Add 1 to {PRODUCT_IMAGES_MAX} photos. The first one is the cover.</p>
        {/* Focus target for the photo error; the picker's add tile sits inside. */}
        <div id={fieldId('images')} tabIndex={-1} className="rounded-xl focus:outline-none">
          <PhotoPicker
            photos={photos.photos}
            problems={photos.problems}
            max={PRODUCT_IMAGES_MAX}
            isUnsaved={photos.isUnsaved}
            onAddFiles={(files) => {
              if (photos.addFiles(files)) clear('images');
            }}
            onRemove={photos.remove}
            altPrefix={name.trim() || 'Product'}
            invalid={Boolean(errors.images)}
            describedBy={errors.images ? 'product-images-error' : undefined} />

        </div>
        {errors.images && <p id="product-images-error" className={errorText}>{errors.images}</p>}
      </section>

      <section aria-labelledby="product-details-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
        <h2 id="product-details-heading" className="text-base font-bold text-ink">Details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor={fieldId('name')} className={label}>Product name</label>
            <input
              id={fieldId('name')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clear('name');
              }}
              placeholder="e.g. Kitchen mixer tap (chrome)"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'product-name-error' : undefined}
              className={`${field} ${errors.name ? bad : ok}`} />

            {errors.name && <p id="product-name-error" className={errorText}>{errors.name}</p>}
          </div>
          <div className="md:col-span-2">
            <label htmlFor={fieldId('category')} className={label}>Category</label>
            <select
              id={fieldId('category')}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as ProductCategory | '');
                clear('category');
              }}
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? 'product-category-error' : undefined}
              className={`${field} ${errors.category ? bad : ok}`}>

              <option value="" disabled>Choose a category</option>
              {productCategories.map((c) =>
              <option key={c.id} value={c.id}>{c.label}</option>
              )}
            </select>
            {errors.category && <p id="product-category-error" className={errorText}>{errors.category}</p>}
          </div>
          <div>
            <label htmlFor={fieldId('price')} className={label}>Price (₦)</label>
            <input
              id={fieldId('price')}
              inputMode="numeric"
              value={price}
              onChange={(e) => {
                setPrice(formatDigits(e.target.value));
                clear('price');
              }}
              placeholder="9,500"
              aria-invalid={Boolean(errors.price)}
              aria-describedby={errors.price ? 'product-price-error' : undefined}
              className={`${field} ${errors.price ? bad : ok}`} />

            {errors.price && <p id="product-price-error" className={errorText}>{errors.price}</p>}
          </div>
          <div>
            <label htmlFor={fieldId('stock')} className={label}>In stock</label>
            <input
              id={fieldId('stock')}
              inputMode="numeric"
              value={stock}
              onChange={(e) => {
                setStock(e.target.value);
                clear('stock');
              }}
              placeholder="12"
              aria-invalid={Boolean(errors.stock)}
              aria-describedby={errors.stock ? 'product-stock-error' : undefined}
              className={`${field} ${errors.stock ? bad : ok}`} />

            {errors.stock && <p id="product-stock-error" className={errorText}>{errors.stock}</p>}
          </div>
          <div>
            <label htmlFor={fieldId('lowStockThreshold')} className={label}>Low-stock alert at</label>
            <input
              id={fieldId('lowStockThreshold')}
              inputMode="numeric"
              value={lowStockThreshold}
              onChange={(e) => {
                setLowStockThreshold(e.target.value);
                clear('lowStockThreshold');
              }}
              placeholder={String(DEFAULT_LOW_STOCK_THRESHOLD)}
              aria-invalid={Boolean(errors.lowStockThreshold)}
              aria-describedby={
              errors.lowStockThreshold ? 'product-threshold-hint product-threshold-error' : 'product-threshold-hint'
              }
              className={`${field} ${errors.lowStockThreshold ? bad : ok}`} />

            <p id="product-threshold-hint" className="mt-1.5 text-sm text-muted">
              Shows “Low stock” at or below this number. Use 0 to turn it off.
            </p>
            {errors.lowStockThreshold &&
            <p id="product-threshold-error" className={errorText}>{errors.lowStockThreshold}</p>
            }
          </div>
          <div className="md:col-span-2">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor={fieldId('description')} className="block text-sm font-bold text-muted">
                Description <span className="font-medium">(optional)</span>
              </label>
              <span
                id="product-description-count"
                className={`text-xs font-semibold tabular-nums ${descriptionLength > PRODUCT_DESCRIPTION_MAX ? 'text-clay-dark' : 'text-muted'}`}>

                {descriptionLength}/{PRODUCT_DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id={fieldId('description')}
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clear('description');
              }}
              placeholder="Size, material, what's in the box, warranty"
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? 'product-description-count product-description-error' : 'product-description-count'}
              className={`${field} resize-y ${errors.description ? bad : ok}`} />

            {errors.description && <p id="product-description-error" className={errorText}>{errors.description}</p>}
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl bg-sand px-4 py-3">
          <Switch
            checked={available}
            onChange={(next) => {
              setAvailable(next);
              clear('images');
            }}
            label="Available to buy"
            describedBy="product-available-hint" />

          <div>
            <p className="text-sm font-bold text-ink">Available to buy</p>
            <p id="product-available-hint" className="text-sm text-muted">Turn off to hide it from your profile without deleting it.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        {onDelete && (
        confirmingDelete ?
        <div role="group" aria-label="Confirm delete" className="flex items-center gap-3 text-sm font-semibold">
              <span className="text-ink">Delete this product?</span>
              <button
            type="button"
            onClick={onDelete}
            className="rounded-lg bg-clay px-3 py-2 font-bold text-white hover:bg-clay-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2">

                Delete
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} className="rounded px-1 text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
                Keep
              </button>
            </div> :

        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="rounded text-left text-sm font-bold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

              Delete product
            </button>)
        }
        <div className="flex gap-3 sm:ml-auto">
          <Link
            to={cancelTo}
            className="flex flex-1 items-center justify-center rounded-xl bg-sand px-5 py-3 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 sm:flex-none">

            Cancel
          </Link>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-pine-deep px-5 py-3 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2 sm:flex-none">

            {isNew ? 'Add product' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>);

}
