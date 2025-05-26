export interface ResultMessageContent {
  requestHash: string;
  content: string;
}

export interface MessageContent {
  status: string;
  message: string;
  content: string | ResultMessageContent;
}
