package com.travelport.core.models;

import java.util.Date;

public class FormDataModel {

    private String dataId;

    private Date submittedDate;

    private String customerName;

    private String status;

    private String inititor;

    private String blended_discount;

    private String[] approvers;

    private String[] approved;

    private String pendingApprovalFrom;

    private String editlink;

    private String approvalLink;

    private String detailViewLink;

    public String getDetailViewLink() {
        return detailViewLink;
    }

    public void setDetailViewLink(String detailViewLink) {
        this.detailViewLink = detailViewLink;
    }

    public String getApprovalLink() {
        return approvalLink;
    }

    public void setApprovalLink(String approvalLink) {
        this.approvalLink = approvalLink;
    }

    public String getEditlink() {
        return editlink;
    }

    public void setEditlink(String editlink) {
        this.editlink = editlink;
    }


    public String getDataId() {
        return dataId;
    }

    public void setDataId(String dataId) {
        this.dataId = dataId;
    }

    public Date getSubmittedDate() {
        return submittedDate;
    }

    public void setSubmittedDate(Date submittedDate) {
        this.submittedDate = submittedDate;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getInititor() {
        return inititor;
    }

    public void setInititor(String inititor) {
        this.inititor = inititor;
    }

    public String[] getApprovers() {
        return approvers;
    }

    public void setApprovers(String[] approvers) {
        this.approvers = approvers;
    }

    public String[] getApproved() {
        return approved;
    }

    public void setApproved(String[] approved) {
        this.approved = approved;
    }

    public String getPendingApprovalFrom() {
        return pendingApprovalFrom;
    }

    public void setPendingApprovalFrom(String pendingApprovalFrom) {
        this.pendingApprovalFrom = pendingApprovalFrom;
    }

    
    public String getBlended_discount() {
        return blended_discount;
    }

    public void setBlended_discount(String blended_discount) {
        this.blended_discount = blended_discount;
    }

    
}
