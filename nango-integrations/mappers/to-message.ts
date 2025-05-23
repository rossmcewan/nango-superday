
import type { UpdateMessageOutput } from '../models';
import type { SlackResponse, SlackSuccessResponse } from '../types';

function isSlackSuccessResponse(response: SlackResponse): response is SlackSuccessResponse {
    return response.ok === true;
}

export function toMessage(response: SlackResponse): UpdateMessageOutput {
    if (isSlackSuccessResponse(response)) {
        return {
            ok: response.ok,
            channel: response.channel,
            ts: response.ts,
            message: response.message.text,
            warning: response.warning,
            error: undefined,
            raw_json: JSON.stringify(response)
        };
    } else {
        return {
            ok: response.ok,
            channel: undefined,
            ts: undefined,
            message: undefined,
            warning: undefined,
            error: response.error,
            raw_json: JSON.stringify(response)
        };
    }
}
