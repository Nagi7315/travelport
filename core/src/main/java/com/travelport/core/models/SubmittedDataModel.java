package com.travelport.core.models;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;

@Model(adaptables = {Resource.class, SlingHttpServletRequest.class},defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class SubmittedDataModel {

    @SlingObject
    private ResourceResolver resolver;

    private List<FormDataModel> dataList;

    @PostConstruct
    public void init() {
        String userId = resolver.getUserID();
        Resource dataResource = resolver.getResource("/content/travelport/us/en/forms-info/jcr:content");

        dataList = new ArrayList<>();
        if (dataResource != null) {
            Iterator<Resource> listOfData = dataResource.listChildren();

            while (listOfData.hasNext()) {
                Resource resource = listOfData.next();
                if (!"root".equals(resource.getName())) {

                    FormDataModel formDataModel = new FormDataModel();
                    Resource approversNode = resource.getChild("approvers");

                    String firstApprover = "";
                    String secondApprover = "";
                    String firstApproverStatus = "";
                    String secondApproverStatus = "";
                    String[] approvers = new String[2];

                    if (approversNode != null) {
                        // First Approver
                        Resource approver1 = approversNode.getChild("approver1");
                        if (approver1 != null) {
                            firstApprover = approver1.getValueMap().get("actor", "");
                            firstApproverStatus = approver1.getValueMap().get("status", "");

                            if ("PENDING".equalsIgnoreCase(firstApproverStatus)) {
                                formDataModel.setPendingApprovalFrom(firstApprover);
                            } else if ("APPROVED".equalsIgnoreCase(firstApproverStatus)) {
                                approvers[0] = firstApprover;
                            }
                        }

                        // Second Approver
                        Resource approver2 = approversNode.getChild("approver2");
                        if (approver2 != null) {
                            secondApprover = approver2.getValueMap().get("actor", "");
                            secondApproverStatus = approver2.getValueMap().get("status", "");

                            if(!"PENDING".equalsIgnoreCase(firstApproverStatus)){
                                if ("PENDING".equalsIgnoreCase(secondApproverStatus)) {
                                    formDataModel.setPendingApprovalFrom(secondApprover);
                                } else if ("APPROVED".equalsIgnoreCase(secondApproverStatus)) {
                                    approvers[1] = secondApprover;
                                }
                            }

                        }

                        // Set both approvers
                        formDataModel.setApprovers(approvers);
                    }

                    // Resource values
                    ValueMap vm = resource.getValueMap();
                    formDataModel.setDataId(resource.getName());
                    formDataModel.setStatus(vm.get("status", ""));
                    formDataModel.setSubmittedDate(vm.get("submittedOn", Date.class));
                    formDataModel.setInititor(vm.get("submittedBy", ""));
                    formDataModel.setBlended_discount(vm.get("blended_discount",""));
                    formDataModel.setDetailViewLink("/content/travelport/us/en/forms-info/details.html?formId=" + formDataModel.getDataId());


                    // Links based on role
                    if (userId.equals(formDataModel.getInititor())) {
                        formDataModel.setEditlink("/content/travelport/us/en/forms-info.html?formId=" + formDataModel.getDataId());
                    } else if (userId.equals(firstApprover)) {
                        formDataModel.setApprovalLink("/content/travelport/us/en/forms-info/approve.html?formId=" + formDataModel.getDataId());
                    } else {
                        formDataModel.setApprovalLink("/content/travelport/us/en/forms-info/approve.html?formId=" + formDataModel.getDataId());
                    }

                    dataList.add(formDataModel);
                }
            }
        }
    }

    public List<FormDataModel> getDataList() {
        return dataList;
    }
}
