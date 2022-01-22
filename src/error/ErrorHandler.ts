import { FastifyRequest, FastifyReply, FastifyLoggerInstance } from "fastify";
import { AppError } from ".";
import * as util from "../misc/util";

class ErrorHandler {
  private readonly logger: FastifyLoggerInstance | Console;
  constructor(logger: FastifyLoggerInstance | Console) {
    this.logger = logger;
  }
  public async handleError(
    error: Error | AppError,
    request?: FastifyRequest,
    reply?: FastifyReply
  ): Promise<void> {
    this.logger.error(`ErrorHandler: ${error.stack}`);

    if (!util.isNil(request) && !util.isNil(reply)) {
      if (error instanceof AppError) {
        reply!.code(error.httpCode);
      }
      if (reply!.statusCode < 500) {
        reply!.log.info({ res: reply, err: error }, error && error.message);
      } else {
        reply!.log.error(
          { req: request, res: reply, err: error },
          error && error.message
        );
      }
      reply!.send(error);
    }
    // await this.logger.error(err);
    // await sendMailToAdminIfCritical();
    // await saveInOpsQueueIfCritical();
    // await determineIfOperationalError();
  }

  public isTrustedError(error: Error) {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }
}

export default ErrorHandler;
