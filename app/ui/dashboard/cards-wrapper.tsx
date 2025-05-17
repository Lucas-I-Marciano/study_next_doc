import { fetchCardData } from "@/app/lib/data";
import { Card } from "./cards";

const CardsWrapper = async () => {
  let resultCardData;
  try {
    resultCardData = await fetchCardData();
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    resultCardData = {
      totalPaidInvoices: 12,
      totalPendingInvoices: 6,
      numberOfInvoices: 25,
      numberOfCustomers: 55,
    };
  }
  const {
    totalPaidInvoices,
    totalPendingInvoices,
    numberOfInvoices,
    numberOfCustomers,
  } = resultCardData;
  console.log(totalPaidInvoices);
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <Card title="Collected" value={totalPaidInvoices} type="collected" />
      <Card title="Pending" value={totalPendingInvoices} type="pending" />
      <Card title="Total Invoices" value={numberOfInvoices} type="invoices" />
      <Card
        title="Total Customers"
        value={numberOfCustomers}
        type="customers"
      />
    </div>
  );
};

export default CardsWrapper;
