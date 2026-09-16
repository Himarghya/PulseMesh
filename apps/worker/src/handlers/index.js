import { handleImageResize } from './image-resize.js';
import { handleCsvProcessing } from './csv-processing.js';
import { handleReportGeneration } from './report-generation.js';
import { handleHttpRequest } from './http-request.js';
import { handleDataTransform } from './data-transform.js';
import { handleMockPayment } from './mock-payment.js';

export const HandlerRegistry = {
  image_resize: handleImageResize,
  csv_processing: handleCsvProcessing,
  report_generation: handleReportGeneration,
  http_request: handleHttpRequest,
  data_transform: handleDataTransform,
  mock_payment: handleMockPayment,
  generic_task: async (payload) => ({ completed: true, received: payload }),
};

export function getHandler(type) {
  return HandlerRegistry[type] || null;
}
