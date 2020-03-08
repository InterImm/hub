import argparse
import os
from collections import OrderedDict
import logging

from dateutil import parser
import requests
import ruamel.yaml as yaml
from ruamel.yaml.representer import RoundTripRepresenter

logging.basicConfig()
logger = logging.getLogger("interimm.hub.add")


# Add representer to ruamel.yaml for OrderedDict
class MyRepresenter(RoundTripRepresenter):
    pass

yaml.add_representer(
    OrderedDict, MyRepresenter.represent_dict, representer=MyRepresenter
)
yaml = yaml.YAML()
yaml.Representer = MyRepresenter

class BearerAuth(requests.auth.AuthBase):
    def __init__(self, token):
        self.token = token
    def __call__(self, r):
        r.headers["authorization"] = "Bearer " + self.token
        return r


class Company():
    def __init__(self, typeform_item=None, save_path=None):
        self.fields = {
            "_id": str,
            "author": str,
            "email": str,
            "name": str,
            "founded": str,
            "base": str,
            "category": str,
            "link": str,
            "about": str,
            "date": str
        }

        if typeform_item:
            self.data = self._parse_typeform(typeform_item)
        else:
            raise Exception("Please specify the source of data")

        if save_path is None:
            save_path = f"_data/companies/company-{self.data['_id']}.yml"

        self.save_path = save_path


    def _parse_typeform(self, typeform_item):

        company = {}
        tf_answers = typeform_item.get("answers")

        company["_id"] = typeform_item.get("landing_id")

        for answer in tf_answers:
            if answer.get("field", {}).get("id") == "AHDrWfPn34rd":
                company["author"] = answer.get("text")
            elif answer.get("field", {}).get("id") == "MEtCSU1iVig2":
                company["email"] = answer.get("email")
            elif answer.get("field", {}).get("id") == "i3sCvb14VkD6":
                company["name"] = answer.get("text")
            elif answer.get("field", {}).get("id") == "cl3YofBO7KKp":
                company["founded"] = parser.parse(answer.get("date")).date().isoformat()
            elif answer.get("field", {}).get("id") == "nLbk9JnRJIsI":
                company["base"] = answer.get("text")
            elif answer.get("field", {}).get("id") == "GWLVKGnm0ZzG":
                company["category"] = answer.get("text")
            elif answer.get("field", {}).get("id") == "OdHc2WjMQne3":
                company["link"] = answer.get("url")
            elif answer.get("field", {}).get("id") == "ferclmh3kC6J":
                company["about"] = answer.get("text")

        company["date"] = parser.parse(typeform_item.get("submitted_at")).date().isoformat()

        return company

    def save(self):

        res = None

        if os.path.isfile(self.save_path):
            logger.debug("Company already created!")
            res = {"status": "exist"}
        else:
            with open(self.save_path, "w+") as fp:
                yaml.dump(
                    OrderedDict(self.data),
                    fp
                )
            logger.info(f"Added a new company {self.data.get('_id')}")
            res = {"status": "added"}

        return res


def main():

    parser = argparse.ArgumentParser(description='Process some integers.')

    parser.add_argument(
        '--token', dest='token',
        help='typeform requires a token'
    )

    args = parser.parse_args()
    token = args.token

    typeform_url = "https://api.typeform.com/forms/AXCqMe/responses?page_size=1000"
    req = requests.get(
        typeform_url,
        auth=BearerAuth(token)
    )

    tf_json = req.json()

    logger.info(tf_json.get("total_items"))

    for comp in tf_json.get("items"):
        comp_obj = Company(typeform_item=comp)
        comp_save = comp_obj.save()
        if comp_save.get("status") == "added":
            break


if __name__ == "__main__":

    main()

    print("End of Game")
