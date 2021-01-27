'use strict';Object.defineProperty(exports,"__esModule",{value:true});var _Constants=require('../../streaming/constants/Constants');var _Constants2=_interopRequireDefault(_Constants);var _DashJSError=require('../../streaming/vo/DashJSError');var _DashJSError2=_interopRequireDefault(_DashJSError);var _FactoryMaker=require('../../core/FactoryMaker');var _FactoryMaker2=_interopRequireDefault(_FactoryMaker);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj};}function RepresentationController(config){config=config||{};var eventBus=config.eventBus;var events=config.events;var errors=config.errors;var abrController=config.abrController;var dashMetrics=config.dashMetrics;var playbackController=config.playbackController;var timelineConverter=config.timelineConverter;var type=config.type;var streamId=config.streamId;var dashConstants=config.dashConstants;var instance=void 0,realAdaptation=void 0,updating=void 0,voAvailableRepresentations=void 0,currentVoRepresentation=void 0;function setup(){resetInitialSettings();eventBus.on(events.QUALITY_CHANGE_REQUESTED,onQualityChanged,instance);eventBus.on(events.REPRESENTATION_UPDATE_COMPLETED,onRepresentationUpdated,instance);eventBus.on(events.WALLCLOCK_TIME_UPDATED,onWallclockTimeUpdated,instance);eventBus.on(events.MANIFEST_VALIDITY_CHANGED,onManifestValidityChanged,instance);}function checkConfig(){if(!abrController||!dashMetrics||!playbackController||!timelineConverter){throw new Error(_Constants2.default.MISSING_CONFIG_ERROR);}}function getData(){return realAdaptation;}function isUpdating(){return updating;}function getCurrentRepresentation(){return currentVoRepresentation;}function resetInitialSettings(){realAdaptation=null;updating=true;voAvailableRepresentations=[];}function reset(){eventBus.off(events.QUALITY_CHANGE_REQUESTED,onQualityChanged,instance);eventBus.off(events.REPRESENTATION_UPDATE_COMPLETED,onRepresentationUpdated,instance);eventBus.off(events.WALLCLOCK_TIME_UPDATED,onWallclockTimeUpdated,instance);eventBus.off(events.MANIFEST_VALIDITY_CHANGED,onManifestValidityChanged,instance);resetInitialSettings();}function getType(){return type;}function getStreamId(){return streamId;}function updateData(newRealAdaptation,availableRepresentations,type,quality){checkConfig();startDataUpdate();voAvailableRepresentations=availableRepresentations;currentVoRepresentation=getRepresentationForQuality(quality);realAdaptation=newRealAdaptation;if(type!==_Constants2.default.VIDEO&&type!==_Constants2.default.AUDIO&&type!==_Constants2.default.FRAGMENTED_TEXT){endDataUpdate();return;}updateAvailabilityWindow(playbackController.getIsDynamic(),true);}function addRepresentationSwitch(){checkConfig();var now=new Date();var currentRepresentation=getCurrentRepresentation();var currentVideoTimeMs=playbackController.getTime()*1000;if(currentRepresentation){dashMetrics.addRepresentationSwitch(currentRepresentation.adaptation.type,now,currentVideoTimeMs,currentRepresentation.id);}}function getRepresentationForQuality(quality){return quality===null||quality===undefined||quality>=voAvailableRepresentations.length?null:voAvailableRepresentations[quality];}function getQualityForRepresentation(voRepresentation){return voAvailableRepresentations.indexOf(voRepresentation);}function isAllRepresentationsUpdated(){for(var i=0,ln=voAvailableRepresentations.length;i<ln;i++){var segmentInfoType=voAvailableRepresentations[i].segmentInfoType;if(voAvailableRepresentations[i].segmentAvailabilityRange===null||!voAvailableRepresentations[i].hasInitialization()||(segmentInfoType===dashConstants.SEGMENT_BASE||segmentInfoType===dashConstants.BASE_URL)&&!voAvailableRepresentations[i].segments){return false;}}return true;}function setExpectedLiveEdge(liveEdge){timelineConverter.setExpectedLiveEdge(liveEdge);dashMetrics.updateManifestUpdateInfo({presentationStartTime:liveEdge});}function updateRepresentation(representation,isDynamic){representation.segmentAvailabilityRange=timelineConverter.calcSegmentAvailabilityRange(representation,isDynamic);if(representation.segmentAvailabilityRange.end<representation.segmentAvailabilityRange.start&&!representation.useCalculatedLiveEdgeTime){var error=new _DashJSError2.default(errors.SEGMENTS_UNAVAILABLE_ERROR_CODE,errors.SEGMENTS_UNAVAILABLE_ERROR_MESSAGE,{availabilityDelay:representation.segmentAvailabilityRange.start-representation.segmentAvailabilityRange.end});endDataUpdate(error);return;}if(isDynamic){setExpectedLiveEdge(representation.segmentAvailabilityRange.end);}}function updateAvailabilityWindow(isDynamic,notifyUpdate){checkConfig();for(var i=0,ln=voAvailableRepresentations.length;i<ln;i++){updateRepresentation(voAvailableRepresentations[i],isDynamic);if(notifyUpdate){eventBus.trigger(events.REPRESENTATION_UPDATE_STARTED,{sender:instance,representation:voAvailableRepresentations[i]});}}}function resetAvailabilityWindow(){voAvailableRepresentations.forEach(function(rep){rep.segmentAvailabilityRange=null;});}function startDataUpdate(){updating=true;eventBus.trigger(events.DATA_UPDATE_STARTED,{sender:instance});}function endDataUpdate(error){updating=false;var eventArg={sender:instance,data:realAdaptation,currentRepresentation:currentVoRepresentation};if(error){eventArg.error=error;}eventBus.trigger(events.DATA_UPDATE_COMPLETED,eventArg);}function postponeUpdate(postponeTimePeriod){var delay=postponeTimePeriod;var update=function update(){if(isUpdating())return;startDataUpdate();// clear the segmentAvailabilityRange for all reps.
// this ensures all are updated before the live edge search starts
resetAvailabilityWindow();updateAvailabilityWindow(playbackController.getIsDynamic(),true);};eventBus.trigger(events.AST_IN_FUTURE,{delay:delay});setTimeout(update,delay);}function onRepresentationUpdated(e){if(e.sender.getType()!==getType()||e.sender.getStreamInfo().id!==streamId||!isUpdating())return;if(e.error){endDataUpdate(e.error);return;}var streamInfo=e.sender.getStreamInfo();var r=e.representation;var manifestUpdateInfo=dashMetrics.getCurrentManifestUpdate();var alreadyAdded=false;var postponeTimePeriod=0;var repInfo=void 0,err=void 0,repSwitch=void 0;if(r.adaptation.period.mpd.manifest.type===dashConstants.DYNAMIC&&!r.adaptation.period.mpd.manifest.ignorePostponeTimePeriod){var segmentAvailabilityTimePeriod=r.segmentAvailabilityRange.end-r.segmentAvailabilityRange.start;// We must put things to sleep unless till e.g. the startTime calculation in ScheduleController.onLiveEdgeSearchCompleted fall after the segmentAvailabilityRange.start
var liveDelay=playbackController.computeLiveDelay(currentVoRepresentation.segmentDuration,streamInfo.manifestInfo.DVRWindowSize);postponeTimePeriod=(liveDelay-segmentAvailabilityTimePeriod)*1000;}if(postponeTimePeriod>0){postponeUpdate(postponeTimePeriod);err=new _DashJSError2.default(errors.SEGMENTS_UPDATE_FAILED_ERROR_CODE,errors.SEGMENTS_UPDATE_FAILED_ERROR_MESSAGE);endDataUpdate(err);return;}if(manifestUpdateInfo){for(var i=0;i<manifestUpdateInfo.representationInfo.length;i++){repInfo=manifestUpdateInfo.representationInfo[i];if(repInfo.index===r.index&&repInfo.mediaType===getType()){alreadyAdded=true;break;}}if(!alreadyAdded){dashMetrics.addManifestUpdateRepresentationInfo(r,getType());}}if(isAllRepresentationsUpdated()){abrController.setPlaybackQuality(getType(),streamInfo,getQualityForRepresentation(currentVoRepresentation));dashMetrics.updateManifestUpdateInfo({latency:currentVoRepresentation.segmentAvailabilityRange.end-playbackController.getTime()});repSwitch=dashMetrics.getCurrentRepresentationSwitch(getCurrentRepresentation().adaptation.type);if(!repSwitch){addRepresentationSwitch();}endDataUpdate();}}function onWallclockTimeUpdated(e){if(e.isDynamic){updateAvailabilityWindow(e.isDynamic);}}function onQualityChanged(e){if(e.mediaType!==getType()||streamId!==e.streamInfo.id)return;currentVoRepresentation=getRepresentationForQuality(e.newQuality);addRepresentationSwitch();}function onManifestValidityChanged(e){if(e.newDuration){var representation=getCurrentRepresentation();if(representation&&representation.adaptation.period){var period=representation.adaptation.period;period.duration=e.newDuration;}}}instance={getData:getData,isUpdating:isUpdating,updateData:updateData,updateRepresentation:updateRepresentation,getCurrentRepresentation:getCurrentRepresentation,getRepresentationForQuality:getRepresentationForQuality,getType:getType,getStreamId:getStreamId,reset:reset};setup();return instance;}/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */RepresentationController.__dashjs_factory_name='RepresentationController';exports.default=_FactoryMaker2.default.getClassFactory(RepresentationController);
//# sourceMappingURL=RepresentationController.js.map
