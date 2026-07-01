import {getMessage, renderMessage} from '../../services/content.service.js';
import {summarizeProviderFailures, type ProviderFailure} from '../../providers/provider.types.js';

export function renderDownloadFailure(scope: string, failures: ProviderFailure[]): string {
    const reason = summarizeProviderFailures(failures);
    return renderMessage(`downloads.${scope}.downloadFailed`, {
        reason: getMessage(`downloads.${scope}.failureReason.${reason}`),
    });
}
