/**
 * SOAR Workflow Service Extension
 *
 * This extends the base WorkflowService to add SOAR-specific functionality.
 * It demonstrates the service extension pattern for backend patching.
 *
 * In a real implementation, this would:
 * - Add approval workflow before activation
 * - Log workflow changes for audit
 * - Integrate with SOAR case management
 */

// Note: These imports would work when properly integrated with n8n's build system
// For now, this serves as a template showing the pattern

/*
import { ExtendService, delegate } from '@n8n-soar/macaques/backend';
import { WorkflowService } from '@n8n/cli/workflows/workflow.service';
import type { User } from '@n8n/db';
import type { WorkflowRequest } from '@n8n/cli';

@ExtendService(WorkflowService, {
  description: 'Adds SOAR workflow management features',
  methodsOverridden: ['update', 'activate'],
})
export class SOARWorkflowService {
  constructor(private original: WorkflowService) {}

  // Delegate unchanged methods to original
  getMany = delegate(this.original, 'getMany');
  get = delegate(this.original, 'get');
  delete = delegate(this.original, 'delete');

  // Override update to add audit logging
  async update(
    user: User,
    workflowId: string,
    updateData: WorkflowRequest.Update
  ) {
    console.log(`[SOAR] Workflow update requested: ${workflowId} by ${user.email}`);

    // In a real implementation:
    // - Check if workflow requires approval
    // - Log the change for audit
    // - Send notifications

    const result = await this.original.update(user, workflowId, updateData);

    console.log(`[SOAR] Workflow updated: ${workflowId}`);

    return result;
  }

  // Override activate to add approval check
  async activate(user: User, workflowId: string) {
    console.log(`[SOAR] Workflow activation requested: ${workflowId} by ${user.email}`);

    // In a real implementation:
    // - Check ApprovalService for approval status
    // - Reject if not approved
    // - Log the activation

    const result = await this.original.activate(user, workflowId);

    console.log(`[SOAR] Workflow activated: ${workflowId}`);

    return result;
  }
}
*/

// Placeholder export for now
export const SOARWorkflowServicePlaceholder = {
  name: 'SOARWorkflowService',
  description: 'Template for SOAR workflow service extension',
};
