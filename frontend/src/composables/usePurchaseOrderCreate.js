import { computed, onMounted, ref } from 'vue';
import { api } from '../api';

export function usePurchaseOrderCreate() {
  const header = ref({ vendor: '', neededByDate: '', currency: 'IDR', paymentTerms: '', notes: '' });
  const lines = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const errorMessage = ref('');
  const actionMessage = ref('');
  const savedOrder = ref(null);
  const selectedLines = computed(() => lines.value.filter((line) => line.selected));
  const estimatedTotal = computed(() => selectedLines.value.reduce(
    (total, line) => total + line.orderQty * line.unitPrice, 0,
  ));

  async function refreshOpenLines() {
    if (loading.value || saving.value || savedOrder.value) return;
    loading.value = true;
    errorMessage.value = '';
    try {
      const { items } = await api.listRequisitions();
      const requisitions = items.filter((item) => item.status === 'APPROVED');
      const results = await Promise.all(requisitions.map((item) => api.getRequisitionOpenLines(item.id)));
      const previousLines = new Map(lines.value.map((line) => [line.id, line]));
      lines.value = results.flatMap(({ requisition, openLines }) =>
        requisition.status !== 'APPROVED' ? [] : openLines.map((line) => {
          const previous = previousLines.get(line.id);
          return {
            id: line.id,
            selected: previous?.selected || false,
            prNo: requisition.prNumber,
            prLine: line.lineNo,
            itemCode: line.itemCode,
            itemName: line.itemName,
            uom: line.uom,
            siteCode: line.siteCode,
            requestedQty: line.qtyRequested,
            allocatedQty: line.qtyAllocated,
            remainingQty: line.qtyOpenForPo,
            orderQty: previous?.orderQty ?? 0,
            deliveryAddress: previous?.deliveryAddress ?? line.siteCode,
            deliveryDate: previous?.deliveryDate ?? line.requiredDate?.slice(0, 10) ?? '',
            unitPrice: previous?.unitPrice ?? line.estUnitPrice,
          };
        }),
      );
    } catch (error) {
      errorMessage.value = error.message;
    } finally {
      loading.value = false;
    }
  }

  function updateLine({ index, field, value }) {
    if (!saving.value && !savedOrder.value) {
      lines.value[index] = { ...lines.value[index], [field]: value };
    }
  }

  function validate() {
    if (!header.value.vendor.trim()) return 'Vendor is required.';
    if (!selectedLines.value.length) return 'Select at least one approved PR line.';
    for (const line of selectedLines.value) {
      const label = `${line.prNo} line ${line.prLine}`;
      if (!Number.isFinite(line.orderQty) || line.orderQty <= 0) {
        return `${label}: order quantity must be greater than 0.`;
      }
      if (line.orderQty > line.remainingQty) {
        return `${label}: allocation qty ${line.orderQty} exceeds remaining ${line.remainingQty}.`;
      }
      if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
        return `${label}: unit price must be greater than or equal to 0.`;
      }
      if (!line.deliveryAddress.trim()) return `${label}: delivery address / site code is required.`;
    }
    return '';
  }

  async function saveOrder(submit = false) {
    if (loading.value || saving.value || savedOrder.value?.status === 'SUBMITTED') return;
    if (savedOrder.value && !submit) return;
    errorMessage.value = savedOrder.value ? '' : validate();
    if (errorMessage.value) return;
    saving.value = true;
    actionMessage.value = '';
    try {
      if (!savedOrder.value) {
        savedOrder.value = await api.createPurchaseOrder({
          vendorName: header.value.vendor.trim(),
          lines: selectedLines.value.map((line) => ({
            prLineId: line.id,
            itemCode: line.itemCode,
            itemName: line.itemName,
            uom: line.uom,
            qtyOrdered: line.orderQty,
            unitPrice: line.unitPrice,
            siteCode: line.deliveryAddress.trim(),
            requiredDate: line.deliveryDate || header.value.neededByDate || null,
          })),
        });
      }
      if (submit) savedOrder.value = await api.submitPurchaseOrder(savedOrder.value.id);
      actionMessage.value = `${savedOrder.value.poNumber}: ${savedOrder.value.status === 'SUBMITTED' ? 'submitted' : 'draft saved'}.`;
    } catch (error) {
      errorMessage.value = savedOrder.value
        ? `${savedOrder.value.poNumber} draft saved. Submission failed: ${error.message}`
        : error.message;
    } finally {
      saving.value = false;
    }
  }

  onMounted(refreshOpenLines);

  return {
    header, lines, loading, saving, errorMessage, actionMessage, savedOrder,
    selectedLines, estimatedTotal, refreshOpenLines, updateLine, saveOrder,
  };
}