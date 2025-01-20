/*
 * Copyright Red Hat, Inc.
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

import React from 'react';

import {
  InfoCard,
  Link,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { RouteFunc, useApi, useRouteRef } from '@backstage/core-plugin-api';
import { AboutField } from '@backstage/plugin-catalog';

import {
  CircularProgress,
  Grid,
  List,
  ListItem,
  makeStyles,
  Typography,
} from '@material-ui/core';
import DotIcon from '@material-ui/icons/FiberManualRecord';

import {
  AssessedProcessInstanceDTO,
  ProcessInstanceErrorDTO,
  ProcessInstanceStatusDTO,
  QUERY_PARAM_ASSESSMENT_INSTANCE_ID,
  WorkflowOverviewDTO,
  WorkflowResultDTO,
  WorkflowResultDTOCompletedWithEnum,
} from '@red-hat-developer-hub/backstage-plugin-orchestrator-common';

import { orchestratorApiRef } from '../api';
import { executeWorkflowRouteRef } from '../routes';
import { buildUrl } from '../utils/UrlUtils';
import {
  WorkflowDescriptionModal,
  WorkflowDescriptionModalProps,
} from './WorkflowDescriptionModal';

const useStyles = makeStyles(theme => ({
  outputGrid: {
    '& h2': {
      textTransform: 'none',
      fontSize: 'small',
    },
  },
  links: {
    padding: '0px',
  },
  values: {
    '& tr > td': {
      paddingLeft: '0px',
    },
  },
  errorIcon: {
    color: theme.palette.error.main,
  },
}));

const finalStates: ProcessInstanceStatusDTO[] = [
  ProcessInstanceStatusDTO.Error,
  ProcessInstanceStatusDTO.Completed,
  ProcessInstanceStatusDTO.Aborted,
  ProcessInstanceStatusDTO.Suspended,
];

const ResultMessage = ({
  status,
  error,
  resultMessage,
  completedWith,
}: {
  status?: ProcessInstanceStatusDTO;
  error?: ProcessInstanceErrorDTO;
  resultMessage?: WorkflowResultDTO['message'];
  completedWith: WorkflowResultDTO['completedWith'];
}) => {
  const styles = useStyles();

  const errorMessage = error?.message || error?.toString();
  let noResult = <></>;
  if (!resultMessage && !errorMessage) {
    if (status && finalStates.includes(status)) {
      noResult = (
        <i>The workflow provided no additional info about the status.</i>
      );
    } else {
      noResult = (
        <Typography>
          <CircularProgress size="0.75rem" />
          &nbsp;The workflow has not yet provided additional info about the
          status.
        </Typography>
      );
    }
  }

  return (
    <>
      {resultMessage && (
        <Typography>
          {completedWith === WorkflowResultDTOCompletedWithEnum.Error && (
            <>
              <DotIcon
                style={{ fontSize: '0.75rem' }}
                className={styles.errorIcon}
              />
              &nbsp;
            </>
          )}
          {resultMessage}
        </Typography>
      )}
      {errorMessage}
      {noResult}
    </>
  );
};

const NextWorkflows = ({
  instanceId,
  nextWorkflows,
}: {
  instanceId: string;
  nextWorkflows: WorkflowResultDTO['nextWorkflows'];
}) => {
  const styles = useStyles();

  const orchestratorApi = useApi(orchestratorApiRef);
  const executeWorkflowLink: RouteFunc<{ workflowId: string }> = useRouteRef(
    executeWorkflowRouteRef,
  );

  const [
    currentOpenedWorkflowDescriptionModalID,
    setCurrentOpenedWorkflowDescriptionModalID,
  ] = React.useState('');

  const [currentWorkflow, setCurrentWorkflow] = React.useState(
    {} as WorkflowOverviewDTO,
  );
  const [workflowError, setWorkflowError] =
    React.useState<WorkflowDescriptionModalProps['workflowError']>();

  const runWorkflowLink = React.useMemo(
    () =>
      buildUrl(
        executeWorkflowLink({
          workflowId: currentOpenedWorkflowDescriptionModalID,
        }),
        {
          [QUERY_PARAM_ASSESSMENT_INSTANCE_ID]: instanceId,
        },
      ),
    [currentOpenedWorkflowDescriptionModalID, executeWorkflowLink, instanceId],
  );

  const openWorkflowDescriptionModal = React.useCallback(
    (itemId: string) => {
      if (itemId) {
        orchestratorApi
          .getWorkflowOverview(itemId)
          .then(workflow => {
            setCurrentWorkflow(workflow.data);
          })
          .catch(error => {
            setWorkflowError({ itemId, error });
          });
        setCurrentOpenedWorkflowDescriptionModalID(itemId);
      }
    },
    [orchestratorApi],
  );

  const closeWorkflowDescriptionModal = React.useCallback(() => {
    setCurrentOpenedWorkflowDescriptionModalID('');
    setCurrentWorkflow({} as WorkflowOverviewDTO);
  }, []);

  if (!nextWorkflows?.length) {
    return null;
  }

  const sectionLabel =
    nextWorkflows.length === 1
      ? 'Suggested next workflow'
      : 'Suggested next workflows';

  return (
    <Grid item xs={12} className={styles.outputGrid}>
      <AboutField label={sectionLabel}>
        <List dense disablePadding>
          {nextWorkflows.map(item => (
            <ListItem key={item.id} disableGutters>
              <Link
                color="primary"
                to="#"
                onClick={() => {
                  openWorkflowDescriptionModal(item.id);
                }}
              >
                {item.name}
              </Link>
            </ListItem>
          ))}
        </List>
      </AboutField>
      <WorkflowDescriptionModal
        workflow={currentWorkflow}
        workflowError={workflowError}
        runWorkflowLink={runWorkflowLink}
        open={!!currentOpenedWorkflowDescriptionModalID}
        onClose={closeWorkflowDescriptionModal}
      />
    </Grid>
  );
};

const WorkflowOutputs = ({
  outputs,
}: {
  outputs: WorkflowResultDTO['outputs'];
}) => {
  const styles = useStyles();

  if (!outputs?.length) {
    return null;
  }

  const links = outputs?.filter(item => item.format === 'link');
  const nonLinksFiltered = outputs?.filter(item => item.format !== 'link');
  const nonLinks = nonLinksFiltered.reduce<{
    [key: string]: any;
  }>((data, item) => {
    let value = item.value || '';
    if (typeof value !== 'string') {
      // This is a workaround for malformed returned data. It should not happen if the sender does WorkflowResult validation properly.
      if (typeof value === 'object') {
        value = `Object: ${JSON.stringify(value)}`;
      } else {
        value = 'Unexpected type';
      }
    }
    return { ...data, [item.key]: value };
  }, {});

  return (
    <>
      {links?.length > 0 && (
        <Grid item md={12} key="__links" className={styles.links}>
          <AboutField label="Links">
            <List dense disablePadding>
              {links
                .filter(
                  item =>
                    item.value && item.key && typeof item.value === 'string',
                )
                .map(item => {
                  return (
                    <ListItem disableGutters key={item.key}>
                      <Link to={item.value as string}>{item.key}</Link>
                    </ListItem>
                  );
                })}
            </List>
          </AboutField>
        </Grid>
      )}

      <Grid item md={12} key="__links" className={styles.values}>
        <AboutField label="Values">
          <StructuredMetadataTable dense metadata={nonLinks} />
        </AboutField>
      </Grid>
    </>
  );
};

export const WorkflowResult: React.FC<{
  assessedInstance: AssessedProcessInstanceDTO;
  className: string;
  cardClassName?: string;
}> = ({ assessedInstance, className, cardClassName }) => {
  const instance = assessedInstance.instance;
  const result = instance.workflowdata?.result;

  return (
    <InfoCard
      title="Results"
      subheader={
        <ResultMessage
          status={instance.state}
          error={instance.error}
          resultMessage={result?.message}
          completedWith={result?.completedWith}
        />
      }
      divider={false}
      className={className}
      cardClassName={cardClassName}
    >
      <Grid container alignContent="flex-start">
        <NextWorkflows
          instanceId={instance.id}
          nextWorkflows={result?.nextWorkflows}
        />
        <WorkflowOutputs outputs={result?.outputs} />
      </Grid>
    </InfoCard>
  );
};

WorkflowResult.displayName = 'WorkflowResult';
