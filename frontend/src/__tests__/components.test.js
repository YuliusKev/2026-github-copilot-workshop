import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PurchaseOrderAllocationTable from '../components/PurchaseOrderAllocationTable.vue';
import PurchaseOrderHeaderForm from '../components/PurchaseOrderHeaderForm.vue';

const allocationLine = {
  id: 'pr-1-line-1',
  selected: true,
  prNo: 'PR-2026-0001',
  prLine: 1,
  itemCode: 'PART-1',
  itemName: 'Spare part',
  uom: 'PCS',
  requestedQty: 10,
  allocatedQty: 4,
  remainingQty: 6,
  orderQty: 3,
  deliveryAddress: '',
  deliveryDate: '',
  unitPrice: 1250,
};

describe('purchase order components', () => {
  it('emits the updated vendor while preserving other header values', async () => {
    const modelValue = {
      vendor: '',
      neededByDate: '',
      currency: 'IDR',
      paymentTerms: 'Net 30',
      notes: '',
    };
    const wrapper = mount(PurchaseOrderHeaderForm, { props: { modelValue } });

    await wrapper.get('#po-vendor').setValue('PT Supplier Jaya');

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toEqual({
      ...modelValue,
      vendor: 'PT Supplier Jaya',
    });
  });

  it('preserves excess order quantity so the page can display a validation error', async () => {
    const wrapper = mount(PurchaseOrderAllocationTable, {
      props: { lines: [allocationLine] },
    });

    await wrapper.get('[aria-label="Order quantity for Spare part"]').setValue('9');

    expect(wrapper.emitted('update-line')?.[0][0]).toEqual({
      index: 0,
      field: 'orderQty',
      value: 9,
    });
  });

  it('does not allow negative unit prices', async () => {
    const wrapper = mount(PurchaseOrderAllocationTable, {
      props: { lines: [allocationLine] },
    });

    await wrapper.get('[aria-label="Unit price for Spare part"]').setValue('-10');

    expect(wrapper.emitted('update-line')?.[0][0]).toEqual({
      index: 0,
      field: 'unitPrice',
      value: 0,
    });
  });
});