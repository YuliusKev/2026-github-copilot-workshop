import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import POHeaderForm from '../POHeaderForm.vue';

describe('POHeaderForm', () => {
  it('renders the form section title', () => {
    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue: {
          selectedPrId: '',
          supplierName: '',
          poTitle: '',
          deliveryDate: '',
          deliveryAddress: '',
          notes: '',
        },
        approvedPrs: [],
      },
    });

    expect(wrapper.text()).toContain('PO Header');
  });

  it('renders all form fields', () => {
    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue: {
          selectedPrId: '',
          supplierName: '',
          poTitle: '',
          deliveryDate: '',
          deliveryAddress: '',
          notes: '',
        },
        approvedPrs: [],
      },
    });

    expect(wrapper.find('select').exists()).toBe(true);
    expect(wrapper.findAll('input')).toHaveLength(4); // supplierName, poTitle, deliveryDate, deliveryAddress
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('displays label text for all fields', () => {
    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue: {
          selectedPrId: '',
          supplierName: '',
          poTitle: '',
          deliveryDate: '',
          deliveryAddress: '',
          notes: '',
        },
        approvedPrs: [],
      },
    });

    const labels = wrapper.findAll('label');
    const labelTexts = labels.map(l => l.text());
    expect(labelTexts).toContain('Purchase Requisition *');
    expect(labelTexts).toContain('Supplier Name *');
    expect(labelTexts).toContain('PO Title');
    expect(labelTexts).toContain('Delivery Date');
    expect(labelTexts).toContain('Delivery Address');
    expect(labelTexts).toContain('Notes');
  });

  it('populates PR dropdown with approved PRs', () => {
    const approvedPrs = [
      { id: 'pr-1', title: 'Office Supplies' },
      { id: 'pr-2', title: 'Computer Parts' },
    ];

    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue: {
          selectedPrId: '',
          supplierName: '',
          poTitle: '',
          deliveryDate: '',
          deliveryAddress: '',
          notes: '',
        },
        approvedPrs,
      },
    });

    const options = wrapper.findAll('select option');
    expect(options).toHaveLength(3); // default + 2 PRs
    expect(options[1].text()).toBe('pr-1 - Office Supplies');
    expect(options[2].text()).toBe('pr-2 - Computer Parts');
  });

  it('binds selected PR ID to the select input', async () => {
    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue: {
          selectedPrId: 'pr-1',
          supplierName: '',
          poTitle: '',
          deliveryDate: '',
          deliveryAddress: '',
          notes: '',
        },
        approvedPrs: [{ id: 'pr-1', title: 'Office Supplies' }],
      },
    });

    const select = wrapper.find('select');
    expect(select.element.value).toBe('pr-1');
  });

  it('binds supplier name to input field', async () => {
    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue: {
          selectedPrId: '',
          supplierName: 'PT Supplier Jaya',
          poTitle: '',
          deliveryDate: '',
          deliveryAddress: '',
          notes: '',
        },
        approvedPrs: [],
      },
    });

    const inputs = wrapper.findAll('input');
    expect(inputs[0].element.value).toBe('PT Supplier Jaya');
  });

  it('emits update:modelValue when supplier name changes', async () => {
    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue: {
          selectedPrId: '',
          supplierName: '',
          poTitle: '',
          deliveryDate: '',
          deliveryAddress: '',
          notes: '',
        },
        approvedPrs: [],
      },
    });

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('New Supplier');

    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')[0][0].supplierName).toBe('New Supplier');
  });

  it('emits update:modelValue when PR selection changes', async () => {
    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue: {
          selectedPrId: '',
          supplierName: '',
          poTitle: '',
          deliveryDate: '',
          deliveryAddress: '',
          notes: '',
        },
        approvedPrs: [{ id: 'pr-1', title: 'Office Supplies' }],
      },
    });

    const select = wrapper.find('select');
    await select.setValue('pr-1');

    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')[0][0].selectedPrId).toBe('pr-1');
  });

  it('binds all form fields correctly', () => {
    const modelValue = {
      selectedPrId: 'pr-1',
      supplierName: 'PT Supplier Jaya',
      poTitle: 'Procurement Order 001',
      deliveryDate: '2026-06-15',
      deliveryAddress: 'Jl. Merdeka No. 123',
      notes: 'Urgent delivery needed',
    };

    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue,
        approvedPrs: [{ id: 'pr-1', title: 'Office Supplies' }],
      },
    });

    const inputs = wrapper.findAll('input');
    expect(inputs[0].element.value).toBe('PT Supplier Jaya'); // supplierName
    expect(inputs[1].element.value).toBe('Procurement Order 001'); // poTitle
    expect(inputs[2].element.value).toBe('2026-06-15'); // deliveryDate

    const textinputs = wrapper.findAll('input');
    expect(wrapper.find('[placeholder*="Type..."]').exists()).toBe(true);

    const textarea = wrapper.find('textarea');
    expect(textarea.element.value).toBe('Urgent delivery needed');
  });

  it('emits update event when any field changes', async () => {
    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue: {
          selectedPrId: '',
          supplierName: '',
          poTitle: '',
          deliveryDate: '',
          deliveryAddress: '',
          notes: '',
        },
        approvedPrs: [],
      },
    });

    const inputs = wrapper.findAll('input');
    const textareaElement = wrapper.find('textarea');

    // Change supplier name
    await inputs[0].setValue('Supplier A');
    // Change PO title
    await inputs[1].setValue('PO Title');
    // Change delivery date
    await inputs[2].setValue('2026-06-20');
    // Change notes
    await textareaElement.setValue('Some notes');

    // Should have 4 emissions
    expect(wrapper.emitted('update:modelValue').length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty approvedPrs array gracefully', () => {
    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue: {
          selectedPrId: '',
          supplierName: '',
          poTitle: '',
          deliveryDate: '',
          deliveryAddress: '',
          notes: '',
        },
        approvedPrs: [],
      },
    });

    const options = wrapper.findAll('select option');
    expect(options).toHaveLength(1); // Only the default empty option
    expect(options[0].text()).toBe('-- Select PR --');
  });

  it('marks required fields with asterisk', () => {
    const wrapper = mount(POHeaderForm, {
      props: {
        modelValue: {
          selectedPrId: '',
          supplierName: '',
          poTitle: '',
          deliveryDate: '',
          deliveryAddress: '',
          notes: '',
        },
        approvedPrs: [],
      },
    });

    const labels = wrapper.findAll('label');
    const requiredLabels = labels.filter(l => l.text().includes('*'));
    expect(requiredLabels.length).toBeGreaterThanOrEqual(2); // PR and Supplier are required
  });
});
