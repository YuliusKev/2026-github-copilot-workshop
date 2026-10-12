<template>
  <section class="card-panel po-header">
    <h3 class="form-section-title">PO Header</h3>
    <div class="header-fields">
      <div class="form-group">
        <label for="po-vendor">Vendor</label>
        <input
          id="po-vendor"
          :value="modelValue.vendor"
          placeholder="Type..."
          @input="updateField('vendor', $event)"
        />
      </div>
      <div class="form-group">
        <label for="po-needed-by">Needed By date</label>
        <input
          id="po-needed-by"
          type="date"
          :value="modelValue.neededByDate"
          @input="updateField('neededByDate', $event)"
        />
      </div>
      <div class="form-group">
        <label for="po-currency">Currency</label>
        <select
          id="po-currency"
          :value="modelValue.currency"
          @change="updateField('currency', $event)"
        >
          <option value="IDR">IDR</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
      <div class="form-group">
        <label for="po-payment-terms">Payment Terms</label>
        <input
          id="po-payment-terms"
          :value="modelValue.paymentTerms"
          placeholder="Type..."
          @input="updateField('paymentTerms', $event)"
        />
      </div>
      <div class="form-group full">
        <label for="po-notes">Notes</label>
        <textarea
          id="po-notes"
          :value="modelValue.notes"
          placeholder="Type..."
          rows="3"
          @input="updateField('notes', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Object, required: true },
});

const emit = defineEmits(["update:modelValue"]);

function updateField(field, event) {
  emit("update:modelValue", {
    ...props.modelValue,
    [field]: event.target.value,
  });
}
</script>

<style scoped>
.po-header {
  margin-bottom: 24px;
}
.po-header .form-section-title {
  margin: 0 0 16px;
}
.header-fields {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  min-width: 0;
}
.form-group.full {
  grid-column: 1 / -1;
}

@media (max-width: 760px) {
  .header-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .header-fields {
    grid-template-columns: 1fr;
  }
  .form-group.full {
    grid-column: auto;
  }
}
</style>
