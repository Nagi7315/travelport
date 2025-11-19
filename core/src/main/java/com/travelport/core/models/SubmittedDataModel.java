package com.travelport.core.models;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Date;

@Model(adaptables = {Resource.class, SlingHttpServletRequest.class})
public class SubmittedDataModel {

    @SlingObject
    ResourceResolver resolver;

    List<FormDataModel> dataList;

    @PostConstruct
    public void init() {
        String userId = resolver.getUserID();
        Resource dataResource = resolver.getResource("/content/travelport/us/en/forms-info/jcr:content");
        Iterator<Resource> listOfData = dataResource.listChildren();
        dataList = new ArrayList<>();
        while (listOfData.hasNext()) {
            Resource resource = listOfData.next();
            if(!resource.getName().equals("root")){
                FormDataModel formDataModel = new FormDataModel();
                Resource approversNode = resource.getChild("approvers");
                String approver1Name = "";
                String approver2Name = "";
                if (approversNode != null) {
                    Resource approver1 = approversNode.getChild("approver1");
                    if (approver1 != null) {
                        approver1Name = approver1.getValueMap().get("actor", "");
                    }
                    Resource approver2 = approversNode.getChild("approver2");
                    if (approver2 != null) {
                        approver2Name = approver2.getValueMap().get("actor", "");
                    }
                }
                ValueMap vm = resource.getValueMap();
                formDataModel.setDataId(resource.getName());
                //formDataModel.setCustomerName(vm.get("customerName", ""));
                formDataModel.setStatus(vm.get("status", ""));
                
                formDataModel.setSubmittedDate(vm.get("submittedOn", Date.class));
                formDataModel.setInititor(vm.get("submittedBy", ""));
                formDataModel.setDetailViewLink("/content/travelport/us/en/forms-info/details.html?formId="+formDataModel.getDataId());
                if(userId.equals(formDataModel.getInititor())){
                    formDataModel.setEditlink("/content/travelport/us/en/forms-info.html?formId="+formDataModel.getDataId());
                } else if (userId.equals(approver1Name)) {
                    formDataModel.setApprovalLink("/content/travelport/us/en/forms-info/approve.html?formId="+formDataModel.getDataId());
                } else {
                    formDataModel.setApprovalLink("/content/travelport/us/en/forms-info/approve.html?formId="+formDataModel.getDataId());
                } 
                dataList.add(formDataModel);
            }

        }

    }

    public List<FormDataModel> getDataList() {
        return dataList;
    }
}
