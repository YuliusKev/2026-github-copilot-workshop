import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import POLineAllocationTable from '../POLineAllocationTable.vue';

describe('POLineAllocationTable', () => {
  it('renders section title', () => {
    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: [],
      },
    });

    expect(wrapper.text()).toContain('Line Allocations');
  });

  it('displays empty state when no allocations provided', () => {
    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: [],
      },
    });

    expect(wrapper.text()).toContain('No lines to allocate');
  });

  it('renders table with allocation data', () => {
    const allocations = [
      {
        description: 'Office Supplies',
        unitPrice: 100,
        remainingQty: 10,
        allocatedQty: 5,
      },
      {
        description: 'Computer Parts',
        unitPrice: 500,
        remainingQty: 3,
        allocatedQty: 2,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Office Supplies');
    expect(rows[0].text()).toContain('$100.00');
    expect(rows[0].text()).toContain('10');
    expect(rows[1].text()).toContain('Computer Parts');
  });

  it('displays correct table headers', () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 5,
        allocatedQty: 2,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const headers = wrapper.findAll('thead th');
    const headerTexts = headers.map(h => h.text());
    expect(headerTexts).toContain('Line');
    expect(headerTexts).toContain('Description');
    expect(headerTexts).toContain('Unit Price');
    expect(headerTexts).toContain('Remaining Qty');
    expect(headerTexts).toContain('Allocated Qty *');
    expect(headerTexts).toContain('Line Total');
  });

  it('formats prices correctly with $ sign and two decimals', () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 150.5,
        remainingQty: 10,
        allocatedQty: 5,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    expect(wrapper.text()).toContain('$150.50');
  });

  it('calculates line total (unitPrice * allocatedQty)', () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 10,
        allocatedQty: 5,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    // unitPrice (100) * allocatedQty (5) = 500
    expect(wrapper.text()).toContain('$500.00');
  });

  it('emits update:modelValue when allocated quantity changes', async () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 10,
        allocatedQty: 5,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const input = wrapper.find('.qty-input');
    await input.setValue(8);

    expect(wrapper.emitted('update:modelValue')).toBeDefined();
  });

  it('displays validation error when allocated qty exceeds remaining qty', async () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 5,
        allocatedQty: 10, // Exceeds remaining
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const row = wrapper.find('tbody tr');
    expect(row.classes()).toContain('row-error');
  });

  it('displays validation error when allocated qty is 0 or negative', async () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 10,
        allocatedQty: 0,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const row = wrapper.find('tbody tr');
    expect(row.classes()).toContain('row-error');
  });

  it('highlights input field with error class when qty is invalid', () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 5,
        allocatedQty: 10,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const input = wrapper.find('.qty-input');
    expect(input.classes()).toContain('input-error');
  });

  it('displays error message for over-allocation', async () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 5,
        allocatedQty: 10,
      },
      {
        description: 'Item B',
        unitPrice: 50,
        remainingQty: 3,
        allocatedQty: 0,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    // Expose validateAllocations method and call it
    const validation = wrapper.vm.validateAllocations();
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors[0]).toContain('exceeds remaining quantity');
  });

  it('displays error message for zero quantity', async () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 10,
        allocatedQty: 0,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const validation = wrapper.vm.validateAllocations();
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors[0]).toContain('must be greater than 0');
  });

  it('passes validation when all quantities are valid', () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 10,
        allocatedQty: 5,
      },
      {
        description: 'Item B',
        unitPrice: 50,
        remainingQty: 20,
        allocatedQty: 15,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const validation = wrapper.vm.validateAllocations();
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('numbers allocation lines starting from 1', () => {
    const allocations = [
      {
        description: 'Item 1',
        unitPrice: 100,
        remainingQty: 10,
        allocatedQty: 5,
      },
      {
        description: 'Item 2',
        unitPrice: 100,
        remainingQty: 10,
        allocatedQty: 5,
      },
      {
        description: 'Item 3',
        unitPrice: 100,
        remainingQty: 10,
        allocatedQty: 5,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const rows = wrapper.findAll('tbody tr');
    // Check that each row starts with the correct line number
    expect(rows[0].text()).toContain('1Item 1');
    expect(rows[1].text()).toContain('2Item 2');
    expect(rows[2].text()).toContain('3Item 3');
  });

  it('allows decimal quantity values', async () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 10,
        allocatedQty: 5.5,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const input = wrapper.find('.qty-input');
    expect(input.element.value).toBe('5.5');
  });

  it('shows remaining quantity correctly', () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 7,
        allocatedQty: 3,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const row = wrapper.find('tbody tr');
    const cells = row.findAll('td');
    // Find the remaining qty cell (index 3)
    expect(cells[3].text()).toContain('7');
  });

  it('exposes validateAllocations method', () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 10,
        allocatedQty: 5,
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    expect(typeof wrapper.vm.validateAllocations).toBe('function');
  });

  it('validates multiple errors in one allocation', () => {
    const allocations = [
      {
        description: 'Item A',
        unitPrice: 100,
        remainingQty: 5,
        allocatedQty: 0, // Error: must be > 0
      },
      {
        description: 'Item B',
        unitPrice: 100,
        remainingQty: 3,
        allocatedQty: 10, // Error: exceeds remaining
      },
    ];

    const wrapper = mount(POLineAllocationTable, {
      props: {
        modelValue: allocations,
      },
    });

    const validation = wrapper.vm.validateAllocations();
    expect(validation.errors).toHaveLength(2);
  });
});
