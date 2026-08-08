export function generateRequestId() {
  const now = new Date();

  const lagosDate = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Africa/Lagos",
    })
  );

  const year = lagosDate.getFullYear();
  const month = String(lagosDate.getMonth() + 1).padStart(2, "0");
  const day = String(lagosDate.getDate()).padStart(2, "0");
  const hour = String(lagosDate.getHours()).padStart(2, "0");
  const minute = String(lagosDate.getMinutes()).padStart(2, "0");
  const second = String(lagosDate.getSeconds()).padStart(2, "0");

  const random = Math.random().toString(36).substring(2, 8);

  return `${year}${month}${day}${hour}${minute}${second}${random}`;
}