import { describe, expect, it } from 'vitest';
import {
  MAX_PRODUCT_IMPORT_ROWS,
  PRODUCT_CATEGORIES,
  REVIEW_REPLY_MAX_LENGTH,
  REVIEW_REPLY_MIN_LENGTH,
} from '@zamani/contracts';
import { productCategories } from '../../data/productCategories';
import { MAX_IMPORT_ROWS } from '../../utils/productImport';
import { REVIEW_REPLY_MAX, REVIEW_REPLY_MIN } from './constants';

// The web forms keep their own (translated) schemas. These limits must match the API's contracts.
describe('web limits match @zamani/contracts', () => {
  it('review reply length', () => {
    expect(REVIEW_REPLY_MIN).toBe(REVIEW_REPLY_MIN_LENGTH);
    expect(REVIEW_REPLY_MAX).toBe(REVIEW_REPLY_MAX_LENGTH);
  });

  it('product import cap', () => {
    expect(MAX_IMPORT_ROWS).toBe(MAX_PRODUCT_IMPORT_ROWS);
  });

  it('product categories', () => {
    expect(productCategories.map((c) => c.id).sort()).toEqual([...PRODUCT_CATEGORIES].sort());
  });
});
