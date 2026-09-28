import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { RouterLink } from 'vue-router';

// Mock API before importing any components that use it
vi.mock('../../api', () => ({
  api: {
    listRequisitions: vi.fn(),
  },
}));

const RouterLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to'],
};

describe('RequisitionListPage', () => {
  let mockApi;
  let RequisitionListPage;

  beforeEach(async () => {
    // Import the mocked API
    const apiModule = await import('../../api');
    mockApi = apiModule.api;
    mockApi.listRequisitions.mockClear();
  });

  it('renders the page header with title and description', async () => {
    mockApi.listRequisitions.mockResolvedValue({ items: [] });
    
    // Import component after mock is set up
    const mod = await import('../RequisitionListPage.vue');
    RequisitionListPage = mod.default;
    
    const wrapper = mount(RequisitionListPage, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    expect(wrapper.text()).toContain('Purchase Requisitions');
    expect(wrapper.text()).toContain('All purchase requisition records');
  });

  it('renders table headers even with no requisitions', async () => {
    mockApi.listRequisitions.mockResolvedValue({ items: [] });
    
    const mod = await import('../RequisitionListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    const headers = wrapper.findAll('thead th');
    expect(headers.length).toBeGreaterThan(0);
    expect(wrapper.find('thead').exists()).toBe(true);
  });

  it('renders table with requisition data', async () => {
    const mockItems = [
      {
        id: 'pr-1',
        prNumber: 'PR-2026-0001',
        requesterName: 'Rina Pratama',
        departmentName: 'Operations',
        title: 'Office Supplies',
        status: 'APPROVED',
        neededByDate: '2026-06-15',
      },
      {
        id: 'pr-2',
        prNumber: 'PR-2026-0002',
        requesterName: 'Budi Santoso',
        departmentName: 'Engineering',
        title: 'Computer Parts',
        status: 'PENDING',
        neededByDate: '2026-07-01',
      },
    ];

    mockApi.listRequisitions.mockResolvedValue({ items: mockItems });
    
    const mod = await import('../RequisitionListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        stubs: { RouterLink: RouterLinkStub },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('PR-2026-0001');
    expect(rows[0].text()).toContain('Rina Pratama');
    expect(rows[0].text()).toContain('Operations');
    expect(rows[1].text()).toContain('PR-2026-0002');
  });

  it('displays status badges with appropriate styling', async () => {
    const mockItems = [
      {
        id: 'pr-1',
        prNumber: 'PR-2026-0001',
        requesterName: 'Rina Pratama',
        departmentName: 'Operations',
        title: 'Office Supplies',
        status: 'APPROVED',
        neededByDate: '2026-06-15',
      },
    ];

    mockApi.listRequisitions.mockResolvedValue({ items: mockItems });
    
    const mod = await import('../RequisitionListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    const badge = wrapper.find('.status-badge');
    expect(badge.text()).toBe('APPROVED');
    expect(badge.classes()).toContain('approved');
  });

  it('handles missing neededByDate gracefully', async () => {
    const mockItems = [
      {
        id: 'pr-1',
        prNumber: 'PR-2026-0001',
        requesterName: 'Rina Pratama',
        departmentName: 'Operations',
        title: 'Office Supplies',
        status: 'APPROVED',
        neededByDate: null,
      },
    ];

    mockApi.listRequisitions.mockResolvedValue({ items: mockItems });
    
    const mod = await import('../RequisitionListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    const row = wrapper.find('tbody tr');
    expect(row.text()).toContain('-');
  });

  it('displays error message when API fails', async () => {
    const errorMessage = 'Failed to load requisitions';
    mockApi.listRequisitions.mockRejectedValue(new Error(errorMessage));
    
    const mod = await import('../RequisitionListPage.vue');
    const Component = mod.default;

    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(wrapper.text()).toContain(errorMessage);
    expect(wrapper.find('.error').exists()).toBe(true);
  });

  it('provides navigation links to requisition detail pages', async () => {
    const mockItems = [
      {
        id: 'pr-1',
        prNumber: 'PR-2026-0001',
        requesterName: 'Rina Pratama',
        departmentName: 'Operations',
        title: 'Office Supplies',
        status: 'APPROVED',
        neededByDate: '2026-06-15',
      },
    ];

    mockApi.listRequisitions.mockResolvedValue({ items: mockItems });
    
    const mod = await import('../RequisitionListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to'],
          },
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    const link = wrapper.find('a[href="/requisitions/pr-1"]');
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe('PR-2026-0001');
  });

  it('calls API on component mount', async () => {
    mockApi.listRequisitions.mockResolvedValue({ items: [] });
    
    const mod = await import('../RequisitionListPage.vue');
    const Component = mod.default;
    
    mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockApi.listRequisitions).toHaveBeenCalledTimes(1);
  });
});
