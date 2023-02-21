---
to: src/stack-<%=name%>.ts
---
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class <%=name%> extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
  }
}
