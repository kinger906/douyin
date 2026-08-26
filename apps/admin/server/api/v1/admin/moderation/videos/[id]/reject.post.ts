import { defineEventHandler } from 'h3';
import { sendAppError } from '~/server/utils/errors';
import { runModerationAction } from '~/server/utils/moderation';

export default defineEventHandler(async (event) => {
  try {
    return await runModerationAction(event, 'reject');
  } catch (err) {
    return sendAppError(event, err);
  }
});
