import React from "react";
// material-ui components
import { makeStyles } from "@material-ui/core/styles";
// @material-ui/icons
import Face from "@material-ui/icons/Face";
import Chat from "@material-ui/icons/Chat";
import Build from "@material-ui/icons/Build";
// core components
import CustomTabs from "components/CustomTabs/CustomTabs.js";
import Card from "components/Card/Card.js";
import CardBody from "components/Card/CardBody.js";

import { cardTitle, cardLink, cardSubtitle } from "assets/jss/nextjs-material-kit.js";

const styles = {
  textCenter: {
    textAlign: "center"
  }
};

const useStyles = makeStyles(styles);

export default function Tabs(props){
  const classes = useStyles();
  const { name, year, base, category, url, author, notes } = props;
  return (
    <div>
      <CustomTabs
        headerColor="primary"
        tabs={[
          {
            tabName: "",
            tabIcon: Face,
            tabContent: (
              <p className={classes.textCenter}>
                  <Card style={{width: "20rem"}}>
                    <CardBody>
                        <h4 className={classes.cardTitle}>{name}</h4>
                        <h6 className={classes.cardSubtitle}>{base}, {year}</h6>
                        <p>
                        {category}
                        </p>
                        <a
                        href="#pablo"
                        className={classes.cardLink}
                        onClick={(e) => e.preventDefault()}>
                        {category}
                        </a>
                        <a
                        href="#pablo"
                        className={classes.cardLink}
                        onClick={(e) => e.preventDefault()}>
                        Another link
                        </a>
                    </CardBody>
                </Card>
              </p>
            )
          },
          {
            tabName: "",
            tabIcon: Chat,
            tabContent: (
              <p className={classes.textCenter}>
                `${notes}`
              </p>
            )
          }
        ]}
      />
    </div>
  );
};