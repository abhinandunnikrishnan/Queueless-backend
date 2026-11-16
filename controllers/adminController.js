
const users = require("../models/userModel");
const orgs = require("../models/orgModel");
const bookings = require("../models/bookingModel");

// Get admin dashboard statistics
exports.getAdminDashboardStatsController = async (req, res) => {
    try {
        const [
            totalUsers,
            totalOrganizations,
            totalBookings,
            waitingBookings,
            servingBookings,
            completedBookings,
            cancelledBookings,
            skippedBookings
        ] = await Promise.all([
            users.countDocuments({ role: "user" }),
            orgs.countDocuments(),
            bookings.countDocuments(),
            bookings.countDocuments({ status: "waiting" }),
            bookings.countDocuments({ status: "serving" }),
            bookings.countDocuments({ status: "completed" }),
            bookings.countDocuments({ status: "cancelled" }),
            bookings.countDocuments({ status: "skipped" })
        ]);

        return res.status(200).json({
            totalUsers,
            totalOrganizations,
            totalBookings,
            bookingStatus: {
                waiting: waitingBookings,
                serving: servingBookings,
                completed: completedBookings,
                cancelled: cancelledBookings,
                skipped: skippedBookings
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};


// Get all users and organizations for Admin Resource page
exports.getAdminResourcesController = async (req, res) => {
    try {
        const [
            allUsers,
            allOrganizations,
            totalUsers,
            totalOrganizations
        ] = await Promise.all([
            users.find({ role: "user" }).select("-password"),
            orgs.find().select("-orgPassword"),
            users.countDocuments({ role: "user" }),
            orgs.countDocuments()
        ]);

        return res.status(200).json({
            totalUsers,
            totalOrganizations,
            users: allUsers,
            organizations: allOrganizations
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};


// Approve an organization
exports.approveOrganizationController = async (req, res) => {
    try {
        const updatedOrganization = await orgs.findByIdAndUpdate(
            req.params.id,
            { approvalStatus: "approved" },
            { new: true }
        ).select("-orgPassword");

        if (!updatedOrganization) {
            return res.status(404).json({
                message: "Organization not found"
            });
        }

        return res.status(200).json({
            message: "Organization approved successfully",
            organization: updatedOrganization
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};


// Remove an organization
exports.removeOrganizationController = async (req, res) => {
    try {
        const deletedOrganization = await orgs.findByIdAndDelete(
            req.params.id
        );

        if (!deletedOrganization) {
            return res.status(404).json({
                message: "Organization not found"
            });
        }

        return res.status(200).json({
            message: "Organization removed successfully"
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};
