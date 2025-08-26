import { getJobDetails } from "@/actions/job.actions";
import JobDetails from "@/components/myjobs/JobDetails";
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

async function JobDetailsPage({ params }: PageProps) {
  const { id } = params;
  const result = await getJobDetails(id);

  if (!result?.success || !result.job) {
    return (
      <div className="col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Job Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">The job you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
            <Button asChild>
              <Link href="/dashboard/myjobs" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to My Jobs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="col-span-3">
      <JobDetails job={result.job} />
    </div>
  );
}

export default JobDetailsPage;
