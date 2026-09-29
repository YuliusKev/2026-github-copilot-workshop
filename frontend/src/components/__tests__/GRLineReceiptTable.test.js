import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import GRLineReceiptTable from '../GRLineReceiptTable.vue';

describe('GRLineReceiptTable', () => {
  it('renders section title', () => {
    const wrapper = mount(GRLineReceiptTable, {
      props: {
        modelValue: [],
      },
    });

    expect(wrapper.text()).toContain('Line Receipts');
  });

  it('displays empty state when no lines provided', () => {
    const wrapper = mount(GRLineReceiptTable, {
      props: {
        modelValue: [],
      },
    });

    expect(wrapper.text()).toContain('No lines to receive');
  });

  it('renders table with receipt line data', () => {
    const lines = [
      {
        description: 'Safety Helmet',
        uom: 'PCS',
        openQty: 10,
        qtyReceived: 5,
        actualSiteCode: 'WH-JKT',
      },
      {
        description: 'Gloves',
        uom: 'PAIR',
        openQty: 3,
        qtyReceived: 2,
        actualSiteCode: 'WH-SBY',
      },
    ];

    const wrapper = mount(GRLineReceiptTable, {
      props: {
        modelValue: lines,
      },
    });

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Safety Helmet');
    expect(rows[0].text()).toContain('10');
    expect(rows[1].text()).toContain('Gloves');
  });

  it('displays correct table headers', () => {
    const wrapper = mount(GRLineReceiptTable, {
      props: {
        modelValue: [
          { description: 'Item A', uom: 'PCS', openQty: 5, qtyReceived: 2, actualSiteCode: 'WH' },
        ],
      },
    });

    const headers = wrapper.findAll('thead th');
    const headerTexts = headers.map((h) => h.text());
    expect(headerTexts).toContain('Line');
    expect(headerTexts).toContain('Description');
    expect(headerTexts).toContain('UOM');
    expect(headerTexts).toContain('Open Qty');
    expect(headerTexts).toContain('Received Qty *');
    expect(headerTexts).toContain('Site Code *');
  });

  it('emits update:modelValue when received quantity changes', async () => {
    const lines = [
      { description: 'Item A', uom: 'PCS', openQty: 10, qtyReceived: 5, actualSiteCode: 'WH' },
    ];

    const wrapper = mount(GRLineReceiptTable, {
      props: {
        modelValue: lines,
      },
    });

    const input = wrapper.find('.qty-input');
    await input.setValue(8);

    expect(wrapper.emitted('update:modelValue')).toBeDefined();
  });

  it('validateLines rejects when received qty exceeds open qty', () => {
    const lines = [
      { description: 'Item A', uom: 'PCS', openQty: 5, qtyReceived: 10, actualSiteCode: 'WH' },
    ];

    const wrapper = mount(GRLineReceiptTable, {
      props: {
        modelValue: lines,
      },
    });

    const result = wrapper.vm.validateLines();
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('exceeds open quantity');
  });

  it('validateLines rejects when received qty is not greater than 0', () => {
    const lines = [
      { description: 'Item A', uom: 'PCS', openQty: 5, qtyReceived: 0, actualSiteCode: 'WH' },
    ];

    const wrapper = mount(GRLineReceiptTable, {
      props: {
        modelValue: lines,
      },
    });

    const result = wrapper.vm.validateLines();
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('must be greater than 0');
  });

  it('validateLines rejects when site code is missing', () => {
    const lines = [
      { description: 'Item A', uom: 'PCS', openQty: 5, qtyReceived: 2, actualSiteCode: '' },
    ];

    const wrapper = mount(GRLineReceiptTable, {
      props: {
        modelValue: lines,
      },
    });

    const result = wrapper.vm.validateLines();
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Site code is required');
  });

  it('validateLines passes for a valid line', () => {
    const lines = [
      { description: 'Item A', uom: 'PCS', openQty: 5, qtyReceived: 5, actualSiteCode: 'WH' },
    ];

    const wrapper = mount(GRLineReceiptTable, {
      props: {
        modelValue: lines,
      },
    });

    const result = wrapper.vm.validateLines();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
