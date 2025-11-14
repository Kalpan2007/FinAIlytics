import { Card, CardContent } from "@/components/ui/card";
import PageLayout from "@/components/page-layout";
import ScheduleReportDrawer from "./_component/schedule-report-drawer";
import ReportTable from "./_component/report-table";
import { Button } from "@/components/ui/button";
import { useGenerateReportMutation } from "@/features/report/reportAPI";


export default function Reports() {
  const [generateReport, { isLoading }] = useGenerateReportMutation();

  const handleGenerateNow = async () => {
    try {
      await generateReport(undefined).unwrap();
    } catch (e) {
      // swallow - UI will remain as-is if error; could add toast later
    }
  };

  return (
    <PageLayout
      title="Report History"
      subtitle="View and manage your financial reports"
      addMarginTop
      rightAction={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateNow} disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate now"}
          </Button>
          <ScheduleReportDrawer />
        </div>
      }
    >
        <Card className="border shadow-none">
          <CardContent>
           <ReportTable />
          </CardContent>
        </Card>
    </PageLayout>
  );
}
