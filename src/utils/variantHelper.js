export const isSameVariant = (v1, v2) => {
  if (!v1 && !v2) return true;
  if (!v1 || !v2) return false;
  if (!Array.isArray(v1.attributes) || !Array.isArray(v2.attributes)) return false;
  if (v1.attributes.length !== v2.attributes.length) return false;

  return v1.attributes.every(attr1 =>
    v2.attributes.some(attr2 => attr1.type === attr2.type && attr1.value === attr2.value)
  );
};
