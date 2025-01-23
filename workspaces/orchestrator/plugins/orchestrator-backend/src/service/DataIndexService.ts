/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { LoggerService } from '@backstage/backend-plugin-api';

import { Client, fetchExchange, gql } from '@urql/core';

import {
  Filter,
  fromWorkflowSource,
  getWorkflowCategory,
  IntrospectionField,
  parseWorkflowVariables,
  ProcessInstance,
  WorkflowDefinition,
  WorkflowInfo,
} from '@red-hat-developer-hub/backstage-plugin-orchestrator-common';

import { ErrorBuilder } from '../helpers/errorBuilder';
import { buildFilterCondition } from '../helpers/filterBuilder';
import { buildGraphQlQuery } from '../helpers/queryBuilder';
import { Pagination } from '../types/pagination';
import { FETCH_PROCESS_INSTANCES_SORT_FIELD } from './constants';

export class DataIndexService {
  private readonly client: Client;
  public processDefinitionArguments: IntrospectionField[] = [];
  public processInstanceArguments: IntrospectionField[] = [];

  public constructor(
    private readonly dataIndexUrl: string,
    private readonly logger: LoggerService,
  ) {
    if (!dataIndexUrl.length) {
      throw ErrorBuilder.GET_NO_DATA_INDEX_URL_ERR();
    }

    this.client = this.getNewGraphQLClient();
  }

  private getNewGraphQLClient(): Client {
    const diURL = `${this.dataIndexUrl}/graphql`;
    return new Client({
      url: diURL,
      exchanges: [fetchExchange],
    });
  }

  public async initInputProcessDefinitionArgs(): Promise<IntrospectionField[]> {
    if (this.processDefinitionArguments.length === 0) {
      this.processDefinitionArguments =
        await this.inspectInputArgument('ProcessDefinition');
    }
    return this.processDefinitionArguments; // For testing purposes
  }

  public graphQLArgumentQuery(type: string): string {
    return `query ${type}Argument {
        __type(name: "${type}Argument") {
          kind
          name
          inputFields {
            name
            type {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
          }
        }
      }`;
  }

  public async inspectInputArgument(
    type: string,
  ): Promise<IntrospectionField[]> {
    const result = await this.client.query(this.graphQLArgumentQuery(type), {});

    this.logger.debug(`Introspection query result: ${JSON.stringify(result)}`);

    if (result?.error) {
      this.logger.error(`Error executing introspection query ${result.error}`);
      throw result.error;
    }

    const pairs: IntrospectionField[] = [];
    if (result?.data?.__type?.inputFields) {
      for (const field of result.data.__type.inputFields) {
        if (
          field.name !== 'and' &&
          field.name !== 'or' &&
          field.name !== 'not'
        ) {
          pairs.push({
            name: field.name,
            type: {
              name: field.type.name,
              kind: field.type.kind,
              ofType: field.type.ofType,
            },
          });
        }
      }
    }
    return pairs;
  }

  public async fetchWorkflowInfo(
    definitionId: string,
  ): Promise<WorkflowInfo | undefined> {
    const graphQlQuery = `{ ProcessDefinitions ( where: {id: {equal: "${definitionId}" } } ) { id, name, version, type, endpoint, serviceUrl, source } }`;

    const result = await this.client.query(graphQlQuery, {});

    this.logger.debug(
      `Get workflow definition result: ${JSON.stringify(result)}`,
    );

    if (result.error) {
      this.logger.error(`Error fetching workflow definition ${result.error}`);
      throw result.error;
    }

    const processDefinitions = result.data.ProcessDefinitions as WorkflowInfo[];

    if (processDefinitions.length === 0) {
      this.logger.info(`No workflow definition found for ${definitionId}`);
      return undefined;
    }

    return processDefinitions[0];
  }

  public async fetchWorkflowServiceUrls(): Promise<Record<string, string>> {
    const graphQlQuery = `{ ProcessDefinitions { id, serviceUrl } }`;

    const result = await this.client.query(graphQlQuery, {});

    this.logger.debug(
      `Get workflow service urls result: ${JSON.stringify(result)}`,
    );

    if (result.error) {
      this.logger.error(`Error fetching workflow service urls ${result.error}`);
      throw result.error;
    }

    const processDefinitions = result.data.ProcessDefinitions as WorkflowInfo[];
    return processDefinitions
      .filter(definition => definition.serviceUrl)
      .map(definition => ({ [definition.id]: definition.serviceUrl! }))
      .reduce((acc, curr) => ({ ...acc, ...curr }), {});
  }

  public async fetchWorkflowInfos(args: {
    definitionIds?: string[];
    pagination?: Pagination;
    filter?: Filter;
  }): Promise<WorkflowInfo[]> {
    this.logger.info(`fetchWorkflowInfos() called: ${this.dataIndexUrl}`);
    const { definitionIds, pagination, filter } = args;

    const definitionIdsCondition =
      definitionIds !== undefined && definitionIds.length > 0
        ? `id: {in: ${JSON.stringify(definitionIds)}}`
        : undefined;

    const filterCondition = filter
      ? buildFilterCondition(
          await this.initInputProcessDefinitionArgs(),
          'ProcessDefinition',
          filter,
        )
      : undefined;

    let whereClause: string | undefined;
    if (definitionIds && filter) {
      whereClause = `and: [{${definitionIdsCondition}}, {${filterCondition}}]`;
    } else if (definitionIdsCondition || filterCondition) {
      whereClause = definitionIdsCondition ?? filterCondition;
    } else {
      whereClause = undefined;
    }

    const graphQlQuery = buildGraphQlQuery({
      type: 'ProcessDefinitions',
      queryBody: 'id, name, version, type, endpoint, serviceUrl, source',
      whereClause,
      pagination,
    });
    this.logger.debug(`GraphQL query: ${graphQlQuery}`);
    const result = await this.client.query(graphQlQuery, {});
    this.logger.debug(
      `Get workflow definitions result: ${JSON.stringify(result)}`,
    );

    if (result.error) {
      this.logger.error(
        `Error fetching data index swf results ${result.error}`,
      );
      throw result.error;
    }

    return result.data.ProcessDefinitions;
  }

  public async fetchInstances(args: {
    definitionIds?: string[];
    pagination?: Pagination;
    filter?: Filter;
  }): Promise<ProcessInstance[]> {
    const { pagination, definitionIds, filter } = args;
    if (pagination) pagination.sortField ??= FETCH_PROCESS_INSTANCES_SORT_FIELD;

    const processIdNotNullCondition = 'processId: {isNull: false}';
    const definitionIdsCondition = definitionIds
      ? `processId: {in: ${JSON.stringify(definitionIds)}}`
      : undefined;
    const type = 'ProcessInstance';
    const filterCondition = filter
      ? buildFilterCondition(
          await this.inspectInputArgument(type),
          type,
          filter,
        )
      : '';

    let whereClause = '';
    const conditions = [];

    if (processIdNotNullCondition) {
      conditions.push(`{${processIdNotNullCondition}}`);
    }

    if (definitionIdsCondition) {
      conditions.push(`{${definitionIdsCondition}}`);
    }

    if (filter) {
      conditions.push(`{${filterCondition}}`);
    }

    if (conditions.length === 0) {
      whereClause = processIdNotNullCondition;
    } else if (conditions.length === 1) {
      whereClause = conditions[0].slice(1, -1); // Remove the outer braces
    } else if (conditions.length > 1) {
      whereClause = `and: [${conditions.join(', ')}]`;
    }

    const graphQlQuery = buildGraphQlQuery({
      type: 'ProcessInstances',
      queryBody:
        'id, processName, processId, businessKey, state, start, end, nodes { id }, variables, parentProcessInstance {id, processName, businessKey}',
      whereClause,
      pagination,
    });

    this.logger.debug(`GraphQL query: ${graphQlQuery}`);

    const result = await this.client.query<{
      ProcessInstances: ProcessInstance[];
    }>(graphQlQuery, {});
    this.logger.debug(
      `Fetch process instances result: ${JSON.stringify(result)}`,
    );
    if (result.error) {
      this.logger.error(`Error when fetching instances: ${result.error}`);
      throw result.error;
    }
    const processInstancesSrc = result.data ? result.data.ProcessInstances : [];

    const processInstances = await Promise.all(
      processInstancesSrc.map(async instance => {
        return await this.getWorkflowDefinitionFromInstance(instance);
      }),
    );
    return processInstances;
  }

  private async getWorkflowDefinitionFromInstance(instance: ProcessInstance) {
    const workflowInfo = await this.fetchWorkflowInfo(instance.processId);
    if (!workflowInfo?.source) {
      throw new Error(
        `Workflow defintion is required to fetch instance ${instance.id}`,
      );
    }
    const workflowDefinitionSrc: WorkflowDefinition = fromWorkflowSource(
      workflowInfo.source,
    );
    if (workflowInfo) {
      instance.category = getWorkflowCategory(workflowDefinitionSrc);
      instance.description = workflowInfo.description;
    }
    return instance;
  }

  public async fetchWorkflowSource(
    definitionId: string,
  ): Promise<string | undefined> {
    const graphQlQuery = `{ ProcessDefinitions ( where: {id: {equal: "${definitionId}" } } ) { id, source } }`;

    const result = await this.client.query(graphQlQuery, {});

    this.logger.debug(
      `Fetch workflow source result: ${JSON.stringify(result)}`,
    );

    if (result.error) {
      this.logger.error(`Error when fetching workflow source: ${result.error}`);
      return undefined;
    }

    const processDefinitions = result.data.ProcessDefinitions as WorkflowInfo[];

    if (processDefinitions.length === 0) {
      this.logger.info(`No workflow source found for ${definitionId}`);
      return undefined;
    }

    return processDefinitions[0].source;
  }

  public async fetchInstancesByDefinitionId(args: {
    definitionId: string;
    limit: number;
    offset: number;
  }): Promise<ProcessInstance[]> {
    const graphQlQuery = `{ ProcessInstances(where: {processId: {equal: "${args.definitionId}" } }, orderBy: {start:DESC}, pagination: {limit: ${args.limit}, offset: ${args.offset}}) { id, processName, state, start, end } }`;

    const result = await this.client.query(graphQlQuery, {});

    this.logger.debug(
      `Fetch workflow instances result: ${JSON.stringify(result)}`,
    );

    if (result.error) {
      this.logger.error(
        `Error when fetching workflow instances: ${result.error}`,
      );
      throw result.error;
    }

    return result.data.ProcessInstances;
  }

  public async fetchInstanceVariables(
    instanceId: string,
  ): Promise<object | undefined> {
    const graphQlQuery = `{ ProcessInstances (where: { id: {equal: "${instanceId}" } } ) { variables } }`;

    const result = await this.client.query(graphQlQuery, {});

    this.logger.debug(
      `Fetch process instance variables result: ${JSON.stringify(result)}`,
    );

    if (result.error) {
      this.logger.error(
        `Error when fetching process instance variables: ${result.error}`,
      );
      throw result.error;
    }

    const processInstances = result.data.ProcessInstances as ProcessInstance[];

    if (processInstances.length === 0) {
      return undefined;
    }

    return parseWorkflowVariables(processInstances[0].variables as object);
  }

  public async fetchDefinitionIdByInstanceId(
    instanceId: string,
  ): Promise<string | undefined> {
    const graphQlQuery = `{ ProcessInstances (where: { id: {equal: "${instanceId}" } } ) { processId } }`;

    const result = await this.client.query(graphQlQuery, {});

    this.logger.debug(
      `Fetch process id from instance result: ${JSON.stringify(result)}`,
    );

    if (result.error) {
      this.logger.error(
        `Error when fetching process id from instance: ${result.error}`,
      );
      throw result.error;
    }

    const processInstances = result.data.ProcessInstances as ProcessInstance[];

    if (processInstances.length === 0) {
      return undefined;
    }

    return processInstances[0].processId;
  }

  public async fetchInstance(
    instanceId: string,
  ): Promise<ProcessInstance | undefined> {
    const FindProcessInstanceQuery = gql`
      query FindProcessInstanceQuery($instanceId: String!) {
        ProcessInstances(where: { id: { equal: $instanceId } }) {
          id
          processName
          processId
          serviceUrl
          businessKey
          state
          start
          end
          nodes {
            id
            nodeId
            definitionId
            type
            name
            enter
            exit
          }
          variables
          parentProcessInstance {
            id
            processName
            businessKey
          }
          error {
            nodeDefinitionId
            message
          }
        }
      }
    `;

    const result = await this.client.query(FindProcessInstanceQuery, {
      instanceId,
    });

    this.logger.debug(
      `Fetch process instance result: ${JSON.stringify(result)}`,
    );

    if (result.error) {
      this.logger.error(
        `Error when fetching process instances: ${result.error}`,
      );
      throw result.error;
    }

    const processInstances = result.data.ProcessInstances as ProcessInstance[];

    if (processInstances.length === 0) {
      return undefined;
    }

    const instance = processInstances[0];

    const workflowInfo = await this.fetchWorkflowInfo(instance.processId);
    if (!workflowInfo?.source) {
      throw new Error(
        `Workflow defintion is required to fetch instance ${instance.id}`,
      );
    }
    const workflowDefinitionSrc: WorkflowDefinition = fromWorkflowSource(
      workflowInfo.source,
    );
    if (workflowInfo) {
      instance.category = getWorkflowCategory(workflowDefinitionSrc);
      instance.description = workflowDefinitionSrc.description;
    }
    return instance;
  }
}
