/*eslint-disable*/
import React from "react";
import Link from "next/link";

// @material-ui/core components
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Tooltip from "@material-ui/core/Tooltip";

// @material-ui/icons
import { Apps, CloudDownload } from "@material-ui/icons";
import DeleteIcon from "@material-ui/icons/Delete";
import IconButton from "@material-ui/core/IconButton";

// core components
import CustomDropdown from "components/CustomDropdown/CustomDropdown.js";
import Button from "components/CustomButtons/Button.js";

import styles from "assets/jss/nextjs-material-kit/components/headerLinksStyle.js";

const useStyles = makeStyles(styles);

export default function HeaderLinks(props) {
  const classes = useStyles();
  return (
    <List className={classes.list}>
      <ListItem className={classes.listItem}>
        <Button
          href="/companies"
          color="transparent"
          target="_blank"
          className={classes.navLink}
        >
          <i className={classes.socialIcons + " fas fa-th"} /> 企业列表
        </Button>
      </ListItem>
      <ListItem className={classes.listItem}>
        <Tooltip
          id="interimm-tooltip"
          title="星际移民中心"
          placement={"top"}
          classes={{ tooltip: classes.tooltip }}
        >
          <Button
            color="transparent"
            href="https://interimm.org"
            target="_blank"
            className={classes.navLink}
          >
            <i className={classes.socialIcons + " fas fa-rocket"} />
          </Button>
        </Tooltip>
      </ListItem>
    </List>
  );
}
