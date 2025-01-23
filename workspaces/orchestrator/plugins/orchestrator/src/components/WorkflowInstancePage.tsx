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

import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ContentHeader,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import {
  useApi,
  useRouteRef,
  useRouteRefParams,
} from '@backstage/core-plugin-api';

import {
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from '@material-ui/core';
import Snackbar from '@material-ui/core/Snackbar';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import ErrorIcon from '@material-ui/icons/Error';
import Alert from '@material-ui/lab/Alert';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import StartIcon from '@mui/icons-material/Start';
import SwipeRightAltOutlinedIcon from '@mui/icons-material/SwipeRightAltOutlined';

import {
  AssessedProcessInstanceDTO,
  orchestratorWorkflowUsePermission,
  orchestratorWorkflowUseSpecificPermission,
  ProcessInstanceStatusDTO,
  QUERY_PARAM_ASSESSMENT_INSTANCE_ID,
  QUERY_PARAM_INSTANCE_ID,
} from '@red-hat-developer-hub/backstage-plugin-orchestrator-common';

import { orchestratorApiRef } from '../api';
import { SHORT_REFRESH_INTERVAL } from '../constants';
import { usePermissionArrayDecision } from '../hooks/usePermissionArray';
import usePolling from '../hooks/usePolling';
import { executeWorkflowRouteRef, workflowInstanceRouteRef } from '../routes';
import { isNonNullable } from '../utils/TypeGuards';
import { buildUrl } from '../utils/UrlUtils';
import { BaseOrchestratorPage } from './BaseOrchestratorPage';
import { InfoDialog } from './InfoDialog';
import { WorkflowInstancePageContent } from './WorkflowInstancePageContent';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    abortButton: {
      backgroundColor: theme.palette.error.main,
      color: theme.palette.getContrastText(theme.palette.error.main),
      '&:hover': {
        backgroundColor: theme.palette.error.dark,
      },
    },
  }),
);

export type AbortConfirmationDialogActionsProps = {
  handleSubmit: () => void;
  handleCancel: () => void;
};

export type AbortAlertDialogActionsProps = {
  handleClose: () => void;
};

export type AbortAlertDialogContentProps = {
  message: string;
};

const AbortConfirmationDialogContent = () => (
  <div>
    <b>
      Are you sure you want to abort this workflow run? <br /> <br />
      Aborting will stop all in-progress and pending steps immediately. Any
      incomplete tasks will not be saved.
    </b>
  </div>
);

export const WorkflowInstancePage = ({
  instanceId,
}: {
  instanceId?: string;
}) => {
  const classes = useStyles();
  const navigate = useNavigate();
  const orchestratorApi = useApi(orchestratorApiRef);
  const executeWorkflowLink = useRouteRef(executeWorkflowRouteRef);
  const { instanceId: queryInstanceId } = useRouteRefParams(
    workflowInstanceRouteRef,
  );
  const [isAbortConfirmationDialogOpen, setIsAbortConfirmationDialogOpen] =
    useState(false);

  const [isAborting, setIsAborting] = React.useState(false);
  const [isAbortSnackbarOpen, setIsAbortSnackbarOpen] = React.useState(false);
  const [abortError, setAbortError] = React.useState('');

  const [isRetrigger, setIsRetrigger] = React.useState(false);
  const [isRetriggerSnackbarOpen, setIsRerunSnackbarOpen] =
    React.useState(false);
  const [retriggerError, setRetriggerError] = React.useState('');

  const handleAbortBarClose = () => {
    setIsAbortSnackbarOpen(false);
  };
  const handleRerunBarClose = () => {
    setIsRerunSnackbarOpen(false);
  };

  const AbortConfirmationDialogActions = (
    props: AbortConfirmationDialogActionsProps,
  ) => (
    <>
      <Button
        onClick={props.handleSubmit}
        variant="contained"
        className={classes.abortButton}
        startIcon={isAborting ? <CircularProgress size="1rem" /> : null}
        disabled={isAborting}
      >
        {' '}
        Abort
      </Button>
      <Button
        onClick={props.handleCancel}
        variant="outlined"
        color="primary"
        disabled={isAborting}
      >
        {' '}
        Cancel
      </Button>
    </>
  );

  const fetchInstance = React.useCallback(async () => {
    if (!instanceId && !queryInstanceId) {
      return undefined;
    }
    const res = await orchestratorApi.getInstance(
      instanceId ?? queryInstanceId,
      true,
    );
    return res.data;
  }, [instanceId, orchestratorApi, queryInstanceId]);

  const { loading, error, value, restart } = usePolling<
    AssessedProcessInstanceDTO | undefined
  >(
    fetchInstance,
    SHORT_REFRESH_INTERVAL,
    (curValue: AssessedProcessInstanceDTO | undefined) =>
      !!curValue &&
      (curValue.instance.state === ProcessInstanceStatusDTO.Active ||
        curValue.instance.state === ProcessInstanceStatusDTO.Pending ||
        !curValue.instance.state),
  );

  const workflowId = value?.instance?.processId;
  const permittedToUse = usePermissionArrayDecision(
    workflowId
      ? [
          orchestratorWorkflowUsePermission,
          orchestratorWorkflowUseSpecificPermission(workflowId),
        ]
      : [orchestratorWorkflowUsePermission],
  );

  const canAbort =
    value?.instance.state === ProcessInstanceStatusDTO.Active ||
    value?.instance.state === ProcessInstanceStatusDTO.Error;

  const canRerun =
    value?.instance.state === ProcessInstanceStatusDTO.Completed ||
    value?.instance.state === ProcessInstanceStatusDTO.Aborted ||
    value?.instance.state === ProcessInstanceStatusDTO.Error;

  const toggleAbortConfirmationDialog = React.useCallback(() => {
    setIsAbortConfirmationDialogOpen(prev => !prev);
  }, []);

  const handleAbort = React.useCallback(async () => {
    if (value) {
      setIsAborting(true);
      try {
        await orchestratorApi.abortWorkflowInstance(value.instance.id);
        restart();
      } catch (e) {
        setAbortError(`Abort failed: ${(e as Error).message}`);
        setIsAbortSnackbarOpen(true);
      } finally {
        setIsAborting(false);
        toggleAbortConfirmationDialog();
      }
    }
  }, [orchestratorApi, restart, value, toggleAbortConfirmationDialog]);

  const handleRerun = React.useCallback(() => {
    if (!value) {
      return;
    }
    const routeUrl = executeWorkflowLink({
      workflowId: value.instance.processId,
    });

    const urlToNavigate = buildUrl(routeUrl, {
      [QUERY_PARAM_INSTANCE_ID]: value.instance.id,
      [QUERY_PARAM_ASSESSMENT_INSTANCE_ID]: value.assessedBy?.id,
    });
    navigate(urlToNavigate);
  }, [value, navigate, executeWorkflowLink]);

  const handleRetrigger = async () => {
    if (value) {
      setIsRetrigger(true);
      try {
        await orchestratorApi.retriggerInstance(
          value.instance.processId,
          value.instance.id,
        );
        restart();
      } catch (retriggerInstanceError) {
        if (retriggerInstanceError.toString().includes('Failed Node Id')) {
          setRetriggerError(`Run failed again`);
        } else setRetriggerError(`Couldn't initiate the run`);
        setIsRerunSnackbarOpen(true);
      } finally {
        setIsRetrigger(false);
      }
    }
  };

  const anchorRef = useRef(null);
  const [openRerunMenu, setOpenRerunMenu] = useState(false);

  const handleClick = () => {
    setOpenRerunMenu(prev => !prev);
  };

  const handleCloseMenu = () => {
    setOpenRerunMenu(false);
  };

  const handleOptionClick = (option: 'retrigger' | 'rerun') => {
    handleCloseMenu();
    if (option === 'rerun') handleRerun();
    else if (option === 'retrigger') handleRetrigger();
  };

  return (
    <BaseOrchestratorPage
      title={value?.instance.id}
      type="All runs"
      typeLink="/orchestrator/instances"
    >
      {loading ? <Progress /> : null}
      {error ? <ResponseErrorPanel error={error} /> : null}
      {!loading && isNonNullable(value) ? (
        <>
          <ContentHeader title="">
            <InfoDialog
              title={
                <Box display="flex" alignItems="center">
                  <ErrorIcon color="error" style={{ marginRight: 8 }} />
                  <b>Abort workflow</b>
                </Box>
              }
              onClose={toggleAbortConfirmationDialog}
              open={isAbortConfirmationDialogOpen}
              dialogActions={
                <AbortConfirmationDialogActions
                  handleCancel={toggleAbortConfirmationDialog}
                  handleSubmit={handleAbort}
                />
              }
              children={<AbortConfirmationDialogContent />}
            />
            <Grid container item justifyContent="flex-end" spacing={1}>
              <Grid item>
                {canAbort && (
                  <Tooltip
                    title="user not authorized to abort workflow"
                    disableHoverListener={permittedToUse.allowed}
                  >
                    <Button
                      variant="outlined"
                      color="primary"
                      disabled={!permittedToUse.allowed}
                      onClick={toggleAbortConfirmationDialog}
                    >
                      Abort
                    </Button>
                  </Tooltip>
                )}
              </Grid>
              <Grid item>
                <Tooltip
                  title="user not authorized to execute workflow"
                  disableHoverListener={permittedToUse.allowed}
                >
                  <Button
                    ref={anchorRef}
                    variant="contained"
                    color="primary"
                    startIcon={
                      isRetrigger ? <CircularProgress size="1rem" /> : null
                    }
                    disabled={!permittedToUse.allowed || !canRerun}
                    onClick={
                      value?.instance.state === ProcessInstanceStatusDTO.Error
                        ? handleClick
                        : handleRerun
                    }
                    endIcon={
                      value?.instance.state ===
                      ProcessInstanceStatusDTO.Error ? (
                        <ArrowDropDown />
                      ) : null
                    }
                    style={{ color: 'white' }}
                  >
                    Rerun
                  </Button>
                </Tooltip>
                <Menu
                  anchorEl={anchorRef.current}
                  open={openRerunMenu}
                  onClose={handleCloseMenu}
                  getContentAnchorEl={null}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={() => handleOptionClick('rerun')}>
                    <StartIcon />
                    Entire workflow
                  </MenuItem>
                  <MenuItem onClick={() => handleOptionClick('retrigger')}>
                    <SwipeRightAltOutlinedIcon />
                    From failure point
                  </MenuItem>
                </Menu>
              </Grid>
            </Grid>
          </ContentHeader>
          <Snackbar
            open={isAbortSnackbarOpen}
            onClose={handleAbortBarClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert
              severity="error"
              action={
                <IconButton
                  size="small"
                  aria-label="close"
                  color="inherit"
                  onClick={handleAbortBarClose}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
            >
              {abortError}
            </Alert>
          </Snackbar>
          <Snackbar
            open={isRetriggerSnackbarOpen}
            onClose={handleRerunBarClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert
              severity="error"
              action={
                <IconButton
                  size="small"
                  aria-label="close"
                  color="inherit"
                  onClick={handleRerunBarClose}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
            >
              {retriggerError}
            </Alert>
          </Snackbar>
          <WorkflowInstancePageContent assessedInstance={value} />
        </>
      ) : null}
    </BaseOrchestratorPage>
  );
};
WorkflowInstancePage.displayName = 'WorkflowInstancePage';
