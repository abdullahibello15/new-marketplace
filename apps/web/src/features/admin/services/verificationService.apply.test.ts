import { beforeAll, describe, expect, it } from 'vitest';
import { addVendor } from '../../../services/vendorStore';
import { buildDraftVendor } from '../../vendor-profile/utils/draftVendor';
import { DOCUMENT_TYPE } from '../constants';
import { applicationsSnapshot, applyForVerification } from './verificationService';

const testVendorIds = ['verification-apply-test', 'verification-validate-test', 'verification-duplicate-test'];

beforeAll(() => {
  for (const id of testVendorIds) {
    addVendor(buildDraftVendor({ id, businessName: `Test ${id}`, tradeCategory: 'plumber', lga: 'Bosso', town: 'Tunga' }));
  }
});

const validInput = {
  businessName: 'Test Verification Business',
  documentType: DOCUMENT_TYPE.NationalId,
  fileName: 'identity-document.pdf',
  note: 'Please review my application.'
};

describe('mock initial vendor verification application', () => {
  it('adds a pending application and stores only the selected filename', async () => {
    const vendorId = testVendorIds[0];
    if (!vendorId) throw new Error('Missing verification test vendor.');

    const application = await applyForVerification(vendorId, validInput);

    expect(application).toMatchObject({
      vendorId,
      vendorName: validInput.businessName,
      applicantNote: validInput.note,
      status: 'pending',
      documents: [{ type: DOCUMENT_TYPE.NationalId, fileName: validInput.fileName }]
    });
    expect(applicationsSnapshot()).toContainEqual(expect.objectContaining({ id: application.id, status: 'pending' }));
    expect('contents' in application.documents[0]!).toBe(false);
  });

  it.each([
    [{ ...validInput, businessName: '   ' }, 'Enter your business name.'],
    [{ ...validInput, documentType: 'unsupported' as typeof DOCUMENT_TYPE.NationalId }, 'Choose a supported document type.'],
    [{ ...validInput, fileName: '' }, 'Choose a document file.'],
    [{ ...validInput, note: 'x'.repeat(501) }, 'Keep your note to 500 characters or fewer.']
  ])('rejects invalid input with a clear message', async (input, message) => {
    const vendorId = testVendorIds[1];
    if (!vendorId) throw new Error('Missing verification validation vendor.');
    await expect(applyForVerification(vendorId, input)).rejects.toMatchObject({ message });
  });

  it('does not create a second application while one is pending', async () => {
    const vendorId = testVendorIds[2];
    if (!vendorId) throw new Error('Missing verification duplicate test vendor.');
    await applyForVerification(vendorId, validInput);

    await expect(applyForVerification(vendorId, validInput)).rejects.toMatchObject({
      status: 409,
      message: 'You already have an application awaiting review.'
    });
  });
});
