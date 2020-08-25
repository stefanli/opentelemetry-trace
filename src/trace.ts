import { Span, Tracer, SpanOptions, Context, Attributes, TimeInput, SpanContext, Status } from "@opentelemetry/api";

/**
 * Helper class for keeping track of a stack of opentelemetry spans. The first
 * span created will be the root span. Every span created after that will have
 * the previously created span assigned as parent. Whenever a span ends it is
 * popped from the stack.
 */
export class Trace<SpanTypes, AttributeTypes> {
  private spanStack: Span[];
  private tracer: Tracer;
  private commonAttributes: {
    [K in keyof AttributeTypes]?: string;
  };

  constructor(tracer: Tracer) {
    this.commonAttributes = {};
    this.spanStack = [];
    this.tracer = tracer;
  }

  public getSpanStack() {
    return [...this.spanStack];
  }

  /**
   * Adds an attribute that will be applied to all previously started spans and
   * all future spans belonging to this trace.
   */
  public addCommonAttribute<T extends Extract<keyof AttributeTypes, string>>(key: T, value: string) {
    for (const span of this.spanStack) {
      span.setAttribute(key, value);
    }
    this.commonAttributes[key] = value;
  }

  /**
   * Start and return a span. If there is a previous span belonging to this
   * trace it will automatically be used as a parent span. Note that this
   * returns a wrapped version of an opentelemetry span that will pop it from
   * the trace stack when end() is called.
   */
  public startSpan<T extends Extract<keyof SpanTypes, string>>(
    name: T,
    attributes?: Attributes,
    context?: Context
  ): SpanWrapper<AttributeTypes> {
    // Retrieve the parent span from stack and create new span.
    const parent = this.spanStack.length > 0 ? this.spanStack[this.spanStack.length - 1] : undefined;
    const spanOptions: SpanOptions = {
      parent,
      attributes,
    };
    const span = this.tracer.startSpan(name, spanOptions, context);

    // Add all common attributes for this trace.
    span.setAttributes(this.commonAttributes);

    // Push the span to the stack.
    this.spanStack.push(span);

    // Create a SpanWrapper that overrides end() to do what we want.
    const endSpan = this.endSpan.bind(this);
    const spanRef: SpanWrapper<AttributeTypes> = {
      context: () => {
        return span.context();
      },
      setAttribute: <T extends Extract<keyof AttributeTypes, string>>(key: T, value: string) => {
        span.setAttribute(key, value);
        return spanRef;
      },
      setAttributes: (_attributes: Partial<AttributeTypes>) => {
        span.setAttributes(_attributes);
        return spanRef;
      },
      addEvent: (_name: string, attributesOrStartTime?: Attributes | TimeInput, startTime?: TimeInput) => {
        span.addEvent(_name, attributesOrStartTime, startTime);
        return spanRef;
      },
      setStatus: (status: Status) => {
        span.setStatus(status);
        return spanRef;
      },
      updateName: (_name: string) => {
        span.updateName(_name);
        return spanRef;
      },
      end: (endTime?: TimeInput) => {
        endSpan(span, endTime);
      },
      isRecording: () => {
        return span.isRecording();
      },
    };

    return spanRef;
  }

  private endSpan(span: Span, endTime?: TimeInput) {
    if (this.spanStack.length === 0) {
      span.setAttribute("span_status", "error_empty_stack");
    } else if (this.spanStack[this.spanStack.length - 1] !== span) {
      span.setAttribute("span_status", "error_not_top");
    } else {
      this.spanStack = this.spanStack.slice(0, this.spanStack.length - 1);
    }
    span.end(endTime);
  }
}

export interface SpanWrapper<AttributeTypes> {
  context(): SpanContext;
  setAttribute<T extends Extract<keyof AttributeTypes, string>>(key: T, value: string): this;
  setAttributes(attributes: Partial<AttributeTypes>): this;
  addEvent(name: string, attributesOrStartTime?: Attributes | TimeInput, startTime?: TimeInput): this;
  setStatus(status: Status): this;
  updateName(name: string): this;
  end(endTime?: TimeInput): void;
  isRecording(): boolean;
}
