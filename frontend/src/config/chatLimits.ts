/** Aligned with ChatGateway (backend) - default values when no env override. */
export const CHAT_MESSAGE_MAX_CHARS = 2000;
export const CHAT_RATE_WINDOW_SEC = 10;
export const CHAT_RATE_MAX_PER_WINDOW = 25;

export const CHAT_RATE_HINT = `Max ${CHAT_RATE_MAX_PER_WINDOW} messages / ${CHAT_RATE_WINDOW_SEC}s · ${CHAT_MESSAGE_MAX_CHARS} characters max.`;
