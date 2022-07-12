import { FastifyLoggerInstance } from "fastify";
import * as jwt from "jsonwebtoken";
import config from "../config";
import { AppError } from "../error";
import { AuthToken } from "../type/app";

class AuthorizationService {
  private readonly logger: FastifyLoggerInstance;

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
  }

  verifyAuthToken(encodedToken: string): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        encodedToken,
        config.jwt.secret,
        { issuer: config.applicationName },
        (error, decoded) => {
          if (error !== null) {
            if (error.name === "TokenExpiredError") {
              reject(
                new AppError(
                  error.name,
                  "Expired token",
                  true,
                  403 // Forbidden: the client is known but not allowed to access
                )
              );
              // case: acess token expired, generate a new token with the refresh token
            } else {
              // JsonWebTokenError
              reject(
                new AppError(
                  "Invalid Token Error",
                  error.message,
                  true,
                  401 // Unauthorized: the unknown user
                )
              );
            }
          }
          resolve((<AuthToken>decoded).uid);
        }
      );
    });
  }

  async validateAuthTokens(
    encodedAccessToken: string,
    encodedRefreshToken: string
  ): Promise<{ uid: string; newAccessToken?: string }> {
    try {
      const uid = await this.verifyAuthToken(encodedAccessToken);
      return { uid };
    } catch (error) {
      if (error instanceof AppError) {
        if (error.name === "TokenExpiredError") {
          // generate a new access token
          const uid = await this.verifyAuthToken(encodedRefreshToken).catch(
            () => {
              // let user sign-in again
              throw new AppError(
                "Session Expired Error",
                "Session expired. Sign-in required",
                true,
                403
              );
            }
          );
          const newAccessToken = await this.generateJWT(
            { uid },
            config.jwt.secret,
            config.jwt.expiration
          );
          return {
            uid,
            newAccessToken,
          };
        }
      }
      throw error;
    }
  }

  async generateJWT(
    payload: Record<string, any>,
    secret: string,
    exipration: string | number
  ) {
    return new Promise<string>((resolve, reject) => {
      jwt.sign(
        payload,
        secret,
        { expiresIn: exipration, issuer: config.applicationName },
        (err, token) => {
          if (err) reject(err);
          resolve(token!);
        }
      );
    });
  }

  async generateTokens(uid: string) {
    const accessToken = await this.generateJWT(
      { uid },
      config.jwt.secret,
      config.jwt.expiration
    );

    const refreshToken = await this.generateJWT(
      { uid },
      config.jwt.secret,
      config.jwt.refreshTokenExpiration
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}

export default AuthorizationService;
