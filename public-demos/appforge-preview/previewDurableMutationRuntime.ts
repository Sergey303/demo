import { previewId } from "../../previewId";
// Preview-only replacement for the staged generated runtime. Never use this
// file in the real generated application. No IndexedDB, auth partition,
// recovery or retry guarantees are implied by a local demo operation.
import type { TransportCallOptions } from "./transportTypes";
export interface BrowserDurableMutationDescriptor {
  databaseName:string; payloadSchemaVersion:number; idempotencyHeaderName:string;
  scopeKey:string; retryPolicy:{initialDelayMs:number;maxDelayMs:number;multiplier:number;maxAttempts:number};
  staleSendingAfterMs:number;maxDeliveryAgeMs:number;
}
export interface DurableMutationExecutor<TInput,TOutput> {
  execute(input:TInput,options?:TransportCallOptions):Promise<TOutput>;
  recover(partitionKey:string):Promise<void>;
  clear(partitionKey:string):Promise<void>;
  clearOtherPartitions(keepPartitionKey:string):Promise<void>;
}
export function createDurableMutationExecutor<TInput,TOutput>(
  _endpointKey:string, descriptor:BrowserDurableMutationDescriptor,
  transport:(input:TInput,options?:TransportCallOptions)=>Promise<TOutput>,
  _errorRefs:readonly string[],
):DurableMutationExecutor<TInput,TOutput>{
  return {
    execute:(input,options)=>transport(input,{...options,headers:{...options?.headers,[descriptor.idempotencyHeaderName]:previewId()}}),
    recover:async()=>{},clear:async()=>{},clearOtherPartitions:async()=>{}
  };
}
