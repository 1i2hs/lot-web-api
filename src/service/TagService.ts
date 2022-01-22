import { FastifyLoggerInstance } from "fastify";
import { TagModule } from "../core";
import { Tag } from "../model";

class TagService {
  private readonly tagModule: TagModule;
  private readonly logger: FastifyLoggerInstance;

  constructor(tagModule: TagModule, logger: FastifyLoggerInstance) {
    this.tagModule = tagModule;
    this.logger = logger;
  }

  public async createTag(ownerId: string, name: string) {
    const newTag = await this.tagModule.createTag(ownerId, name);

    return newTag;
  }

  public async getTags(ownerId: string, phrase: string) {
    const tags = await this.tagModule.getTags(ownerId, phrase);

    return tags;
  }

  public async getTag(ownerId: string, id: number) {
    const tag = await this.tagModule.getTag(ownerId, id);

    return tag;
  }

  public async updateTag(ownerId: string, id: number, name: string) {
    const updatedTag = await this.tagModule.updateTag(ownerId, id, name);

    return updatedTag;
  }

  public async deleteItem(ownerId: string, id: number) {
    const deletedTagId = await this.tagModule.deleteTag(ownerId, id);

    return deletedTagId;
  }
}

export default TagService;
