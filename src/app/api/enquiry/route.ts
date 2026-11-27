import { createEnquiryHandlers } from "@/lib/server/enquiry-handler";
import { serverEnv } from "@/lib/server/env";

// The only dynamic endpoint on the site.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createEnquiryHandlers({ env: serverEnv });

export const GET = handlers.GET;
export const POST = handlers.POST;
