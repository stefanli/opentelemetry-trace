# opentelemetry-trace

A simple class that provides trace functionality for opentelemetry spans without using context. Keeps track of a stack of spans and automatically assigns parent spans and allows you to set common attributes for all spans that are part of the trace.

Example usage:

```
import * as opentelemetry from "@opentelemetry/api";
import { BasicTracerProvider, BatchSpanProcessor } from "@opentelemetry/tracing";
import { Trace } from "./trace";

// Setup your opentelemetry tracer

const tracerProvider = new BasicTracerProvider();
const detfaultTracer = tracerProvider.getTracer("default");
opentelemetry.trace.setGlobalTracerProvider(tracerProvider);

// Define a schema for allowed span names and attributes

export enum SpanNameKey {
  API_CALL = "api_call",
  CONNECT_DB = "connect_db"
}

export type SpanNames = {
  [key in SpanNameKey]: () => void;
};

export enum SpanAttributeKey {
  USER_ID = "user_id",
  USER_EMAIL = "user_email"
}

export type Attributes = {
  [key in SpanAttributeKey]: () => void;
};

apiCall() {
  const trace = new Trace<SpanNames, Attributes>(detfaultTracer);
  
  const apiSpan = trace.startSpan(SpanNameKey.API_CALL);

  const connectDbSpan = trace.startSpan(SpanNameKey.CONNECT_DB);
  // Connect to db ...
  // Obtain userId ...
  
  trace.addCommonAttribute(SpanAttributeKey.USER_ID, userId);
  connectDbSpan.end();

  // Do some api related things ...
  apiSpan.end();
}
```