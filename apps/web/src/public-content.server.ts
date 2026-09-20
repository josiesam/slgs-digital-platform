import {
  createPublicContentFromEnvironment,
  withPublicContentCache,
  type PublicContentGateway,
} from "@slgs/public-content/server";

let cachedGateway: PublicContentGateway | undefined;

export function getPublicContentGateway(): PublicContentGateway {
  return (cachedGateway ??= withPublicContentCache(
    createPublicContentFromEnvironment(process.env),
  ));
}
