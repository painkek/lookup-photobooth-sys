// Local-timezone date helpers.
// toISOString() converts to UTC, which shifts Philippine dates back
// by 8 hours — sales before 8 AM would land on the previous day.

export const toLocalDate = (date) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d - offset).toISOString().split("T")[0];
};

export const todayLocal = () => toLocalDate(new Date());
