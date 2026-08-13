# Display Real-Time Progress for IntegratorAgent

The IntegratorAgent handles the heaviest part of the pipeline (generating all components in parallel, validating, and self-healing). Since this can take a few minutes, we will add real-time streaming progress logs to the UI so you can see exactly what it's doing.

## Proposed Changes

### 1. `IAgent.ts`
- Update the `IAgent` interface to accept an optional `onProgress` callback in the `execute` method.

#### [MODIFY] src/core/interfaces/IAgent.ts

### 2. `LangGraphWorkflow.ts`
- Pass a callback function when calling `agent.execute(currentState, onProgress)`.
- This callback will push the progress message into the pipeline logs and instantly trigger a UI update so the terminal logs in the UI stream in real-time.

#### [MODIFY] src/application/workflow/LangGraphWorkflow.ts

### 3. `IntegratorAgent.ts`
- Add the `onProgress` parameter to the `execute` method.
- Add `onProgress('Generating ...')` calls throughout the component generation loop, the component repair loop, and the bundle self-healing loop.

#### [MODIFY] src/infrastructure/agents/IntegratorAgent.ts

## Verification Plan
- Run `npx vitest run` to ensure tests still pass.
- I will run `npm run build` to ensure the type-checking succeeds.
- Once done, the UI's Terminal window will automatically show granular logs from the IntegratorAgent in real-time instead of appearing frozen.
